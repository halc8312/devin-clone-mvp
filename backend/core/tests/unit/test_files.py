import pytest
import base64

from app.models.file import ProjectFile


@pytest.mark.asyncio
class TestFileAPI:
    """Test file endpoints."""
    
    async def test_create_file(self, client, auth_headers, test_project):
        """Test file creation."""
        file_data = {
            "name": "main.py",
            "path": "/main.py",
            "type": "file",
            "content": "# Main file\nprint('Hello')",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/files",
            json=file_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == file_data["name"]
        assert data["path"] == file_data["path"]
        assert data["type"] == file_data["type"]
        assert data["content"] == file_data["content"]
        assert data["language"] == "python"
        assert data["size_bytes"] == len(file_data["content"])
    
    async def test_create_directory(self, client, auth_headers, test_project):
        """Test directory creation."""
        dir_data = {
            "name": "src",
            "path": "/src",
            "type": "directory",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/files",
            json=dir_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == dir_data["name"]
        assert data["type"] == "directory"
        assert data["size_bytes"] == 0
    
    async def test_list_files(self, client, auth_headers, test_project, test_file):
        """Test listing files."""
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/files",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert "total" in data
        assert data["total"] >= 1
        
        file_names = [f["name"] for f in data["files"]]
        assert test_file.name in file_names
    
    async def test_get_file(self, client, auth_headers, test_project, test_file):
        """Test getting a specific file."""
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/files/{test_file.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_file.id)
        assert data["name"] == test_file.name
        assert data["content"] == test_file.content
    
    async def test_update_file(self, client, auth_headers, test_project, test_file):
        """Test updating a file."""
        update_data = {
            "content": "# Updated content\nprint('Updated')",
        }
        
        response = await client.put(
            f"/api/v1/projects/{test_project.id}/files/{test_file.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == update_data["content"]
        assert data["size_bytes"] == len(update_data["content"])
    
    async def test_move_file(self, client, auth_headers, test_project, test_file, db_session):
        """Test moving a file."""
        # Create a directory to move file into
        src_dir = ProjectFile(
            project_id=test_project.id,
            name="src",
            path="/src",
            type="directory",
        )
        db_session.add(src_dir)
        await db_session.commit()
        await db_session.refresh(src_dir)
        
        move_data = {
            "new_path": "/src/test.py",
            "parent_id": str(src_dir.id),
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/files/{test_file.id}/move",
            json=move_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["path"] == move_data["new_path"]
        assert data["parent_id"] == move_data["parent_id"]
    
    async def test_delete_file(self, client, auth_headers, test_project, test_file):
        """Test deleting a file."""
        response = await client.delete(
            f"/api/v1/projects/{test_project.id}/files/{test_file.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "successfully deleted" in response.json()["message"]
        
        # Verify file is deleted
        get_response = await client.get(
            f"/api/v1/projects/{test_project.id}/files/{test_file.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    async def test_file_tree(self, client, auth_headers, test_project, db_session):
        """Test getting file tree structure."""
        # Create a directory structure
        src_dir = ProjectFile(
            project_id=test_project.id,
            name="src",
            path="/src",
            type="directory",
        )
        db_session.add(src_dir)
        await db_session.commit()
        await db_session.refresh(src_dir)
        
        # Create file in directory
        src_file = ProjectFile(
            project_id=test_project.id,
            parent_id=src_dir.id,
            name="app.py",
            path="/src/app.py",
            type="file",
            content="# App file",
        )
        db_session.add(src_file)
        await db_session.commit()
        
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/files/tree",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Find src directory in tree
        src_node = next(node for node in data if node["name"] == "src")
        assert src_node["type"] == "directory"
        assert len(src_node["children"]) == 1
        assert src_node["children"][0]["name"] == "app.py"


@pytest.mark.asyncio
class TestFileLimits:
    """Test file limits and quotas."""
    
    async def test_file_count_limit(self, client, auth_headers, test_project):
        """Test file count limits per project."""
        # Create files up to limit (20 for free tier)
        for i in range(20):
            response = await client.post(
                f"/api/v1/projects/{test_project.id}/files",
                json={
                    "name": f"file{i}.txt",
                    "path": f"/file{i}.txt",
                    "type": "file",
                    "content": "test",
                },
                headers=auth_headers
            )
            assert response.status_code == 201
        
        # Try to create one more (should fail)
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/files",
            json={
                "name": "file21.txt",
                "path": "/file21.txt",
                "type": "file",
                "content": "test",
            },
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "file limit" in response.json()["detail"].lower()
    
    async def test_file_size_limit(self, client, auth_headers, test_project):
        """Test individual file size limit."""
        # Try to create a file that's too large (>5MB)
        large_content = "x" * (5 * 1024 * 1024 + 1)  # 5MB + 1 byte
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/files",
            json={
                "name": "large.txt",
                "path": "/large.txt",
                "type": "file",
                "content": large_content,
            },
            headers=auth_headers
        )
        assert response.status_code == 413
        assert "too large" in response.json()["detail"].lower()
    
    async def test_project_size_limit(self, client, auth_headers, test_project):
        """Test total project size limit."""
        # Create files that approach the 10MB limit for free tier
        file_size = 2 * 1024 * 1024  # 2MB per file
        content = "x" * file_size
        
        # Create 4 files (8MB total)
        for i in range(4):
            response = await client.post(
                f"/api/v1/projects/{test_project.id}/files",
                json={
                    "name": f"large{i}.txt",
                    "path": f"/large{i}.txt",
                    "type": "file",
                    "content": content,
                },
                headers=auth_headers
            )
            assert response.status_code == 201
        
        # Try to create one more that would exceed limit
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/files",
            json={
                "name": "toolarge.txt",
                "path": "/toolarge.txt",
                "type": "file",
                "content": content,
            },
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "storage limit" in response.json()["detail"].lower()