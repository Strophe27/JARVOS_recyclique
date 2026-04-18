"""
Redis minimal en mémoire pour les tests (sans serveur, sans dépendance supplémentaire).

Couvre les opérations utilisées par ActivityService, le cache utilisateur (auth) et
les accès Redis légers des tests d'activité / statuts.
"""

from __future__ import annotations

import fnmatch
import time
from typing import Any, Dict, List, Optional, Tuple, Union


class MemoryRedisForTests:
    """Sous-ensemble de l'API redis.Redis suffisant pour la suite ciblée."""

    def __init__(self) -> None:
        self._strings: Dict[str, Tuple[str, Optional[float]]] = {}
        self._hashes: Dict[str, Dict[str, str]] = {}
        self._hash_expire: Dict[str, float] = {}

    def ping(self) -> bool:
        return True

    def _now(self) -> float:
        return time.time()

    def _purge_string_if_expired(self, key: str) -> None:
        if key not in self._strings:
            return
        _, exp = self._strings[key]
        if exp is not None and exp <= self._now():
            del self._strings[key]

    def _hash_expired(self, key: str) -> bool:
        exp = self._hash_expire.get(key)
        return exp is not None and exp <= self._now()

    def _purge_hash_if_expired(self, key: str) -> None:
        if key not in self._hashes:
            self._hash_expire.pop(key, None)
            return
        if self._hash_expired(key):
            del self._hashes[key]
            self._hash_expire.pop(key, None)

    def get(self, key: str) -> Optional[str]:
        self._purge_string_if_expired(key)
        if key not in self._strings:
            return None
        val, exp = self._strings[key]
        if exp is not None and exp <= self._now():
            del self._strings[key]
            return None
        return val

    def set(
        self,
        name: str,
        value: Any,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        now = self._now()
        if nx and name in self._strings:
            self._purge_string_if_expired(name)
            if name in self._strings:
                return False
        if xx and name not in self._strings:
            return False
        exp: Optional[float] = None
        if ex is not None:
            exp = now + float(ex)
        elif px is not None:
            exp = now + float(px) / 1000.0
        self._strings[name] = (str(value), exp)
        return True

    def setex(self, name: str, time_sec: int, value: Any) -> bool:
        return self.set(name, value, ex=int(time_sec))

    def delete(self, *names: str) -> int:
        n = 0
        for key in names:
            removed = False
            if key in self._strings:
                del self._strings[key]
                removed = True
            if key in self._hashes:
                del self._hashes[key]
                self._hash_expire.pop(key, None)
                removed = True
            if removed:
                n += 1
        return n

    def exists(self, *names: str) -> int:
        count = 0
        for key in names:
            self._purge_string_if_expired(key)
            self._purge_hash_if_expired(key)
            if key in self._strings or key in self._hashes:
                count += 1
        return count

    def incr(self, name: str, amount: int = 1) -> int:
        self._purge_string_if_expired(name)
        raw = self.get(name)
        if raw is None:
            val = amount
        else:
            val = int(raw) + amount
        self.set(name, val)
        return val

    def expire(self, name: str, time_sec: int) -> bool:
        sec = int(time_sec)
        if name in self._hashes:
            self._purge_hash_if_expired(name)
            if name not in self._hashes:
                return False
            self._hash_expire[name] = self._now() + float(sec)
            return True
        if name in self._strings:
            val, _ = self._strings[name]
            self._strings[name] = (val, self._now() + float(sec))
            return True
        return False

    def ttl(self, name: str) -> int:
        self._purge_string_if_expired(name)
        self._purge_hash_if_expired(name)
        if name in self._strings:
            _, exp = self._strings[name]
            if exp is None:
                return -1
            remaining = int(exp - self._now())
            if remaining < 0:
                del self._strings[name]
                return -2
            return remaining
        if name in self._hashes:
            exp = self._hash_expire.get(name)
            if exp is None:
                return -1
            remaining = int(exp - self._now())
            if remaining < 0:
                del self._hashes[name]
                self._hash_expire.pop(name, None)
                return -2
            return remaining
        return -2

    def keys(self, pattern: str) -> List[str]:
        out: List[str] = []
        for k in list(self._strings.keys()):
            self._purge_string_if_expired(k)
            if k in self._strings and fnmatch.fnmatch(k, pattern):
                out.append(k)
        for k in list(self._hashes.keys()):
            self._purge_hash_if_expired(k)
            if k in self._hashes and fnmatch.fnmatch(k, pattern):
                out.append(k)
        return out

    def hset(
        self,
        name: str,
        key: Optional[str] = None,
        value: Optional[str] = None,
        mapping: Optional[Dict[str, Union[str, bytes]]] = None,
    ) -> int:
        if name not in self._hashes:
            self._hashes[name] = {}
        n = 0
        if mapping:
            for mk, mv in mapping.items():
                self._hashes[name][str(mk)] = (
                    mv.decode("utf-8") if isinstance(mv, bytes) else str(mv)
                )
                n += 1
        elif key is not None:
            self._hashes[name][str(key)] = (
                value.decode("utf-8") if isinstance(value, bytes) else str(value)
            )
            n = 1
        return n

    def hgetall(self, name: str) -> Dict[str, str]:
        self._purge_hash_if_expired(name)
        return dict(self._hashes.get(name, {}))
