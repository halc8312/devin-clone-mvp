"""Security audit utilities for the application."""
import re
from typing import List, Dict, Any, Optional
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.user import User


class SecurityAuditor:
    """Security audit and validation utilities."""
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    PASSWORD_PATTERNS = [
        (r'[A-Z]', 'Password must contain at least one uppercase letter'),
        (r'[a-z]', 'Password must contain at least one lowercase letter'),
        (r'[0-9]', 'Password must contain at least one digit'),
        (r'[!@#$%^&*(),.?":{}|<>]', 'Password must contain at least one special character'),
    ]
    
    # Rate limiting
    MAX_LOGIN_ATTEMPTS = 5
    LOGIN_LOCKOUT_DURATION = timedelta(minutes=15)
    
    # Input validation patterns
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    USERNAME_PATTERN = r'^[a-zA-Z0-9_-]{3,32}$'
    
    # File security
    ALLOWED_FILE_EXTENSIONS = {
        '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.cs',
        '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.r',
        '.html', '.css', '.scss', '.sass', '.less',
        '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.env',
        '.md', '.txt', '.log', '.csv',
        '.sh', '.bash', '.zsh', '.fish', '.ps1',
        '.sql', '.graphql', '.proto',
        '.Dockerfile', '.dockerignore', '.gitignore',
    }
    
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    
    # XSS prevention patterns
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>',
    ]
    
    @classmethod
    def validate_password(cls, password: str) -> List[str]:
        """Validate password strength and return list of issues."""
        issues = []
        
        if len(password) < cls.MIN_PASSWORD_LENGTH:
            issues.append(f'Password must be at least {cls.MIN_PASSWORD_LENGTH} characters long')
        
        for pattern, message in cls.PASSWORD_PATTERNS:
            if not re.search(pattern, password):
                issues.append(message)
        
        # Check for common passwords
        common_passwords = ['password', '12345678', 'qwerty', 'abc123', 'password123']
        if password.lower() in common_passwords:
            issues.append('Password is too common')
        
        return issues
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format."""
        return bool(re.match(cls.EMAIL_PATTERN, email))
    
    @classmethod
    def validate_username(cls, username: str) -> bool:
        """Validate username format."""
        return bool(re.match(cls.USERNAME_PATTERN, username))
    
    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename for security."""
        # Remove path traversal attempts
        filename = filename.replace('..', '').replace('/', '').replace('\\', '')
        
        # Remove null bytes
        filename = filename.replace('\x00', '')
        
        # Limit length
        max_length = 255
        if len(filename) > max_length:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:max_length - len(ext) - 1] + '.' + ext if ext else name[:max_length]
        
        return filename
    
    @classmethod
    def validate_file_upload(cls, filename: str, content: bytes) -> List[str]:
        """Validate file upload for security issues."""
        issues = []
        
        # Check file extension
        ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        if ext not in cls.ALLOWED_FILE_EXTENSIONS:
            issues.append(f'File type {ext} is not allowed')
        
        # Check file size
        if len(content) > cls.MAX_FILE_SIZE:
            issues.append(f'File size exceeds maximum of {cls.MAX_FILE_SIZE // 1024 // 1024}MB')
        
        # Check for malicious content patterns
        content_str = content.decode('utf-8', errors='ignore')
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, content_str, re.IGNORECASE):
                issues.append('File contains potentially malicious content')
                break
        
        return issues
    
    @classmethod
    def sanitize_html(cls, html: str) -> str:
        """Remove potentially dangerous HTML."""
        # Remove script tags
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove event handlers
        html = re.sub(r'\s*on\w+\s*=\s*["\'][^"\'>]*["\']', '', html, flags=re.IGNORECASE)
        
        # Remove javascript: URLs
        html = re.sub(r'javascript:', '', html, flags=re.IGNORECASE)
        
        # Remove dangerous tags
        dangerous_tags = ['iframe', 'object', 'embed', 'form', 'input', 'button']
        for tag in dangerous_tags:
            html = re.sub(f'<{tag}[^>]*>.*?</{tag}>', '', html, flags=re.IGNORECASE | re.DOTALL)
            html = re.sub(f'<{tag}[^>]*/?>', '', html, flags=re.IGNORECASE)
        
        return html
    
    @classmethod
    def generate_secure_token(cls, length: int = 32) -> str:
        """Generate a cryptographically secure random token."""
        return secrets.token_urlsafe(length)
    
    @classmethod
    def hash_token(cls, token: str) -> str:
        """Hash a token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @classmethod
    def verify_token(cls, token: str, stored_hash: str) -> bool:
        """Verify a token against its hash."""
        return hmac.compare_digest(cls.hash_token(token), stored_hash)
    
    @classmethod
    async def check_rate_limit(
        cls,
        db: AsyncSession,
        user_id: str,
        action: str,
        max_attempts: int,
        window: timedelta
    ) -> bool:
        """Check if user has exceeded rate limit for an action."""
        # This would typically use Redis for better performance
        # For now, simplified implementation
        cutoff_time = datetime.utcnow() - window
        
        # You would implement a RateLimit model to track attempts
        # For now, return True (not limited)
        return True
    
    @classmethod
    def validate_api_key(cls, api_key: str) -> bool:
        """Validate API key format."""
        # API keys should be 32+ characters, alphanumeric with some special chars
        if len(api_key) < 32:
            return False
        
        # Check format
        if not re.match(r'^[a-zA-Z0-9_-]+$', api_key):
            return False
        
        return True
    
    @classmethod
    def get_security_headers(cls) -> Dict[str, str]:
        """Get recommended security headers."""
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }


class InputValidator:
    """Input validation utilities."""
    
    @staticmethod
    def validate_uuid(value: str) -> bool:
        """Validate UUID format."""
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        return bool(re.match(uuid_pattern, value, re.IGNORECASE))
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format."""
        url_pattern = r'^https?://[\w\-]+(\.[\w\-]+)+[/#?]?.*$'
        return bool(re.match(url_pattern, url))
    
    @staticmethod
    def sanitize_path(path: str) -> str:
        """Sanitize file path to prevent directory traversal."""
        # Remove any parent directory references
        path = path.replace('..', '')
        
        # Remove null bytes
        path = path.replace('\x00', '')
        
        # Ensure path starts with /
        if not path.startswith('/'):
            path = '/' + path
        
        # Remove duplicate slashes
        path = re.sub(r'/+', '/', path)
        
        return path
    
    @staticmethod
    def validate_json_size(json_str: str, max_size_mb: float = 1.0) -> bool:
        """Validate JSON payload size."""
        max_size_bytes = max_size_mb * 1024 * 1024
        return len(json_str.encode('utf-8')) <= max_size_bytes


# Security decorators
def require_verified_email(func):
    """Decorator to require verified email."""
    async def wrapper(*args, current_user: User = None, **kwargs):
        if not current_user or not current_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required"
            )
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper


def require_active_subscription(func):
    """Decorator to require active subscription."""
    async def wrapper(*args, current_user: User = None, db: AsyncSession = None, **kwargs):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Check subscription status
        from app.models.subscription import Subscription, SubscriptionStatus
        result = await db.execute(
            select(Subscription).where(
                and_(
                    Subscription.user_id == current_user.id,
                    Subscription.status == SubscriptionStatus.ACTIVE
                )
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active subscription required"
            )
        
        return await func(*args, current_user=current_user, db=db, **kwargs)
    return wrapper