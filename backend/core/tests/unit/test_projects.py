import pytest
from sqlalchemy import select

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


@pytest.mark.asyncio
class TestProjectAPI:
    """Test project endpoints."""
    
    async def test_create_project(self, client, auth_headers):
        """Test project creation."""
        project_data = {
            "name": "My Test Project",
            "description": "A test project",
            "language": "python",
            "template": "blank",
        }
        
        response = await client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == project_data["name"]
        assert data["description"] == project_data["description"]
        assert data["language"] == project_data["language"]
        assert data["template"] == project_data["template"]
        assert "id" in data
        assert "created_at" in data
    
    async def test_create_project_unauthorized(self, client):
        """Test project creation without auth."""
        response = await client.post(
            "/api/v1/projects/",
            json={"name": "Test"}
        )
        assert response.status_code == 401
    
    async def test_list_projects(self, client, auth_headers, test_project):
        """Test listing projects."""
        response = await client.get(
            "/api/v1/projects/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert "total" in data
        assert data["total"] >= 1
        
        project_ids = [p["id"] for p in data["projects"]]
        assert str(test_project.id) in project_ids
    
    async def test_get_project(self, client, auth_headers, test_project):
        """Test getting a specific project."""
        response = await client.get(
            f"/api/v1/projects/{test_project.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_project.id)
        assert data["name"] == test_project.name
    
    async def test_get_project_not_found(self, client, auth_headers):
        """Test getting non-existent project."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/api/v1/projects/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    async def test_update_project(self, client, auth_headers, test_project):
        """Test updating a project."""
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description",
        }
        
        response = await client.put(
            f"/api/v1/projects/{test_project.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
    
    async def test_delete_project(self, client, auth_headers, test_project):
        """Test deleting a project."""
        response = await client.delete(
            f"/api/v1/projects/{test_project.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "successfully deleted" in response.json()["message"]
        
        # Verify project is deleted
        get_response = await client.get(
            f"/api/v1/projects/{test_project.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    async def test_project_stats(self, client, auth_headers, test_project, test_file):
        """Test getting project statistics."""
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_files"] == 1
        assert data["total_size_kb"] > 0
        assert "language_breakdown" in data
        assert "python" in data["language_breakdown"]


@pytest.mark.asyncio
class TestProjectLimits:
    """Test project limits and quotas."""
    
    async def test_free_tier_project_limit(self, client, auth_headers, db_session, test_user):
        """Test free tier can only create 1 project."""
        # Create first project (should succeed)
        response = await client.post(
            "/api/v1/projects/",
            json={"name": "Project 1"},
            headers=auth_headers
        )
        assert response.status_code == 201
        
        # Try to create second project (should fail)
        response = await client.post(
            "/api/v1/projects/",
            json={"name": "Project 2"},
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "project limit" in response.json()["detail"].lower()
    
    async def test_pro_tier_project_limit(self, client, auth_headers, db_session, test_user):
        """Test pro tier has no project limit."""
        # Mock user as having pro subscription
        from app.models.subscription import Subscription, SubscriptionStatus
        
        subscription = Subscription(
            user_id=test_user.id,
            stripe_subscription_id="sub_test123",
            stripe_price_id="price_test123",
            stripe_product_id="prod_test123",
            status=SubscriptionStatus.ACTIVE,
        )
        db_session.add(subscription)
        await db_session.commit()
        
        # Create multiple projects
        for i in range(5):
            response = await client.post(
                f"/api/v1/projects/",
                json={"name": f"Project {i+1}"},
                headers=auth_headers
            )
            assert response.status_code == 201