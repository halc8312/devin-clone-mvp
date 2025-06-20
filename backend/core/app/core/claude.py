"""
Claude API integration
"""
import os
import httpx
from typing import Optional, List, Dict, Any, AsyncIterator
import json
from datetime import datetime

from app.core.config import settings


class ClaudeClient:
    """Claude API client for AI interactions"""
    
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = settings.CLAUDE_MODEL
        self.base_url = "https://api.anthropic.com/v1"
        self.headers = {
            "anthropic-version": "2023-06-01",
            "x-api-key": self.api_key,
            "content-type": "application/json"
        }
        
    async def create_message(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Create a message with Claude
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            system: System prompt
            max_tokens: Maximum tokens in response
            temperature: Temperature for randomness
            stream: Whether to stream the response
            
        Returns:
            API response dict
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream
        }
        
        if system:
            payload["system"] = system
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=self.headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    
    async def create_message_stream(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> AsyncIterator[str]:
        """
        Create a streaming message with Claude
        
        Yields:
            Chunks of response text
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        
        if system:
            payload["system"] = system
            
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/messages",
                headers=self.headers,
                json=payload,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]  # Remove "data: " prefix
                        
                        if data == "[DONE]":
                            break
                            
                        try:
                            event = json.loads(data)
                            
                            if event["type"] == "content_block_delta":
                                if "text" in event["delta"]:
                                    yield event["delta"]["text"]
                                    
                        except json.JSONDecodeError:
                            continue


class CodeAssistant:
    """AI assistant for code generation and assistance"""
    
    def __init__(self, claude_client: ClaudeClient):
        self.client = claude_client
        
    async def generate_code(
        self,
        prompt: str,
        language: str,
        context: Optional[str] = None,
        existing_code: Optional[str] = None
    ) -> str:
        """Generate code based on prompt"""
        system_prompt = f"""You are an expert {language} programmer. 
Generate clean, efficient, and well-commented code.
Follow best practices and common conventions for {language}.
If existing code is provided, maintain consistency with its style."""

        messages = []
        
        if context:
            messages.append({
                "role": "user",
                "content": f"Project context:\n{context}"
            })
            
        if existing_code:
            messages.append({
                "role": "user", 
                "content": f"Existing code:\n```{language}\n{existing_code}\n```"
            })
            
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        response = await self.client.create_message(
            messages=messages,
            system=system_prompt,
            temperature=0.3  # Lower temperature for code generation
        )
        
        return response["content"][0]["text"]
    
    async def explain_code(
        self,
        code: str,
        language: str
    ) -> str:
        """Explain what the code does"""
        system_prompt = """You are an expert programmer and teacher.
Explain code clearly and concisely, highlighting:
1. What the code does
2. How it works
3. Any important patterns or techniques used
4. Potential improvements or issues"""

        messages = [{
            "role": "user",
            "content": f"Explain this {language} code:\n```{language}\n{code}\n```"
        }]
        
        response = await self.client.create_message(
            messages=messages,
            system=system_prompt,
            temperature=0.5
        )
        
        return response["content"][0]["text"]
    
    async def fix_errors(
        self,
        code: str,
        error_message: str,
        language: str
    ) -> str:
        """Fix errors in code"""
        system_prompt = f"""You are an expert {language} programmer.
Fix the error in the provided code.
Explain what was wrong and how you fixed it.
Ensure the fixed code follows best practices."""

        messages = [{
            "role": "user",
            "content": f"""Fix this {language} code that has an error:
            
Code:
```{language}
{code}
```

Error message:
{error_message}"""
        }]
        
        response = await self.client.create_message(
            messages=messages,
            system=system_prompt,
            temperature=0.3
        )
        
        return response["content"][0]["text"]
    
    async def suggest_improvements(
        self,
        code: str,
        language: str
    ) -> str:
        """Suggest improvements for code"""
        system_prompt = f"""You are an expert {language} programmer and code reviewer.
Review the code and suggest improvements for:
1. Performance
2. Readability
3. Maintainability
4. Security
5. Best practices

Provide specific, actionable suggestions with code examples."""

        messages = [{
            "role": "user",
            "content": f"Review and suggest improvements for this {language} code:\n```{language}\n{code}\n```"
        }]
        
        response = await self.client.create_message(
            messages=messages,
            system=system_prompt,
            temperature=0.5
        )
        
        return response["content"][0]["text"]


# Global instances
claude_client = ClaudeClient()
code_assistant = CodeAssistant(claude_client)