import time
from fastapi import Request, HTTPException
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class InMemoryRateLimiter:
    """Production-ready, in-memory IP-based rate limiter to protect critical endpoints."""
    def __init__(self):
        # Maps IP -> list of request timestamps
        self.requests = defaultdict(list)
        
    def get_client_ip(self, request: Request) -> str:
        # Resolve client IP behind reverse proxies/CDNs safely
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    def check_rate_limit(self, request: Request, limit: int, window_seconds: int = 60):
        client_ip = self.get_client_ip(request)
        current_time = time.time()
        
        # Prune timestamps outside of the sliding window
        self.requests[client_ip] = [t for t in self.requests[client_ip] if current_time - t < window_seconds]
        
        if len(self.requests[client_ip]) >= limit:
            oldest_request = self.requests[client_ip][0]
            retry_after = max(1, int(window_seconds - (current_time - oldest_request)))
            logger.warning(f"Abuse Warning: Rate limit exceeded for IP {client_ip}. Hit limit of {limit} requests in {window_seconds}s.")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Please wait {retry_after} seconds before requesting this service again."
            )
            
        self.requests[client_ip].append(current_time)

# Global singleton
rate_limiter = InMemoryRateLimiter()
