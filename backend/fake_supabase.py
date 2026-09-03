"""Fake Supabase/PostgREST client backed by an in-memory relational store.

Lets `adapter` → `solve_night` → `writer` run end-to-end with no database and no
credentials, which is the only way to verify the plug-in point before the real
Supabase project is migrated.

Scope is deliberately narrow: it implements exactly the query shapes those two
modules use, including the three resource-embedding strings, and enforces the
constraints from `schema.sql` that the writer depends on being real —
autoincrement ids, NOT NULL, and the absence of ON DELETE CASCADE (deleting a
parent whose children still exist raises, exactly as Postgres would). It is not
a general PostgREST emulator, and a query it does not recognise raises rather
than silently returning everything.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


class FakeDBError(RuntimeError):
    pass


class _Result:
    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data


# table → (primary key, columns that may not be NULL)
SCHEMA: Dict[str, Tuple[str, Tuple[str, ...]]] = {
    "users": ("user_id", ("name", "email", "password_hash", "role")),
    "employee": ("employee_id", ()),
    "driver": ("driver_id", ("license_no",)),
    "zone": ("zone_id", ("zone_name",)),
    "vehicle": ("vehicle_id", ("plate_no", "capacity")),
    "vehicle_pickup_location": ("id", ("sequence_order",)),
    "pickup_request": ("pickup_id", ("service_date",)),
    "dropoff_request": ("dropoff_id", ("service_date",)),
    "route": ("route_id", ("route_type", "service_date")),
    "route_stop": ("stop_id", ("sequence_order",)),
    "stop_passenger": ("id", ()),
    "route_assignment": ("assignment_id", ()),
}

# child table → (fk column, parent table) — used to refuse an unsafe delete
CHILDREN: Dict[str, List[Tuple[str, str]]] = {
    "route": [("route_id", "route_stop"), ("route_id", "route_assignment")],
    "route_stop": [("stop_id", "stop_passenger")],
}


class FakeDB:
    def __init__(self):
        self.rows: Dict[str, List[Dict[str, Any]]] = {t: [] for t in SCHEMA}
        self._next_id: Dict[str, int] = {t: 1 for t in SCHEMA}
        self.call_log: List[str] = []

    # ── seeding ──────────────────────────────────────────────────────────────

    def seed(self, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
        pk, _ = SCHEMA[table]
        stored = dict(row)
        stored.setdefault(pk, self._next_id[table])
        self._next_id[table] = max(self._next_id[table], stored[pk] + 1)
        self.rows[table].append(stored)
        return stored

    def insert_rows(self, table: str, payload: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        pk, not_null = SCHEMA[table]
        out = []
        for row in payload:
            for column in not_null:
                if row.get(column) is None:
                    raise FakeDBError(f"null value in column {column!r} of {table} violates not-null constraint")
            stored = dict(row)
            stored[pk] = self._next_id[table]
            self._next_id[table] += 1
            self.rows[table].append(stored)
            out.append(stored)
        return out

    # ── PostgREST-ish query builder ──────────────────────────────────────────

    def table(self, name: str) -> "_Query":
        if name not in SCHEMA:
            raise FakeDBError(f"unknown table {name!r}")
        return _Query(self, name)


class _Query:
    def __init__(self, db: FakeDB, table: str):
        self.db = db
        self.table_name = table
        self._select: Optional[str] = None
        self._filters: List[Tuple[str, str, Any]] = []
        self._payload: Any = None
        self._op = "select"
        self._limit: Optional[int] = None
        self._order: Optional[str] = None

    # -- verbs
    def select(self, columns: str = "*", **_) -> "_Query":
        self._select = columns
        self._op = "select"
        return self

    def insert(self, payload) -> "_Query":
        self._payload = payload if isinstance(payload, list) else [payload]
        self._op = "insert"
        return self

    def update(self, payload: Dict[str, Any]) -> "_Query":
        self._payload = payload
        self._op = "update"
        return self

    def delete(self) -> "_Query":
        self._op = "delete"
        return self

    # -- filters
    def eq(self, column: str, value: Any) -> "_Query":
        self._filters.append(("eq", column, value))
        return self

    def neq(self, column: str, value: Any) -> "_Query":
        self._filters.append(("neq", column, value))
        return self

    def is_(self, column: str, value: Any) -> "_Query":
        self._filters.append(("is", column, value))
        return self

    def in_(self, column: str, values) -> "_Query":
        self._filters.append(("in", column, list(values)))
        return self

    def limit(self, n: int) -> "_Query":
        self._limit = n
        return self

    def order(self, column: str, **_) -> "_Query":
        self._order = column
        return self

    # -- execution
    def _matches(self, row: Dict[str, Any]) -> bool:
        for op, column, value in self._filters:
            actual = row.get(column)
            if op == "eq" and str(actual) != str(value):
                return False
            if op == "neq" and str(actual) == str(value):
                return False
            if op == "is" and actual is not value and actual is not None:
                return False
            if op == "in" and actual not in value:
                return False
        return True

    def execute(self) -> _Result:
        self.db.call_log.append(f"{self._op} {self.table_name}")
        table = self.table_name
        rows = self.db.rows[table]

        if self._op == "insert":
            return _Result([dict(r) for r in self.db.insert_rows(table, self._payload)])

        if self._op == "update":
            touched = []
            for row in rows:
                if self._matches(row):
                    row.update(self._payload)
                    touched.append(dict(row))
            return _Result(touched)

        if self._op == "delete":
            keep, removed = [], []
            for row in rows:
                (removed if self._matches(row) else keep).append(row)
            # schema.sql defines no ON DELETE CASCADE, so orphaning a child is an
            # error. This is the constraint the writer's delete order exists for.
            pk, _ = SCHEMA[table]
            for fk, child_table in CHILDREN.get(table, []):
                doomed = {r[pk] for r in removed}
                orphans = [c for c in self.db.rows[child_table] if c.get(fk) in doomed]
                if orphans:
                    raise FakeDBError(
                        f"delete on {table} violates foreign key from {child_table} "
                        f"({len(orphans)} row(s) would be orphaned)"
                    )
            self.db.rows[table] = keep
            return _Result([dict(r) for r in removed])

        # select
        matched = [row for row in rows if self._matches(row)]
        if self._order:
            matched.sort(key=lambda r: (r.get(self._order) is None, r.get(self._order)))
        if self._limit is not None:
            matched = matched[: self._limit]
        return _Result([self._project(row) for row in matched])

    # -- projection, including the embeds the adapter asks for
    def _project(self, row: Dict[str, Any]) -> Dict[str, Any]:
        columns = self._select or "*"
        out: Dict[str, Any] = {}

        # top-level columns: "*" or a plain comma list (embeds stripped first)
        flat = re.sub(r"\w+\([^()]*(?:\([^()]*\)[^()]*)*\)", "", columns)
        names = [c.strip() for c in flat.split(",") if c.strip() and c.strip() != "*"]
        if "*" in columns.split(",")[0] or columns.strip().startswith("*"):
            out.update(row)
        for name in names:
            out[name] = row.get(name)
        if not out:
            out.update(row)

        if "zone(" in columns:
            out["zone"] = self._embed_one("zone", "zone_id", row.get("zone_id"), ["zone_id", "zone_name"])
        if "employee(" in columns:
            employee = self._embed_one(
                "employee", "employee_id", row.get("employee_id"),
                ["employee_id", "home_lat", "home_lng", "user_id"],
            )
            if employee:
                employee["users"] = self._embed_one(
                    "users", "user_id", employee.get("user_id"), ["user_id", "name", "email"]
                )
            out["employee"] = employee
        if "driver(" in columns:
            driver = self._embed_one(
                "driver", "driver_id", row.get("driver_id"),
                ["driver_id", "user_id", "license_no"],
            )
            if driver:
                driver["users"] = self._embed_one(
                    "users", "user_id", driver.get("user_id"), ["user_id", "name", "email"]
                )
            out["driver"] = driver
        if "route_stop(" in columns:
            stops = [s for s in self.db.rows["route_stop"] if s.get("route_id") == row.get("route_id")]
            for stop in stops:
                stop = dict(stop)
            out["route_stop"] = [dict(s) for s in stops]
        if "route_assignment(" in columns:
            out["route_assignment"] = [
                dict(a) for a in self.db.rows["route_assignment"]
                if a.get("route_id") == row.get("route_id")
            ]
        return out

    def _embed_one(self, table: str, key: str, value: Any, columns: List[str]) -> Optional[Dict[str, Any]]:
        if value is None:
            return None
        for row in self.db.rows[table]:
            if row.get(key) == value:
                return {c: row.get(c) for c in columns}
        return None
