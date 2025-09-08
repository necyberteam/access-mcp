#!/usr/bin/env python3
"""
Test suite for XDMoD Python MCP Server
"""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from server import XDMoDPythonServer


class TestXDMoDPythonServer:
    def setup_method(self):
        """Set up test fixtures"""
        self.server_instance = XDMoDPythonServer()
    
    def test_server_initialization(self):
        """Test server initializes correctly"""
        assert self.server_instance.server is not None
        assert self.server_instance.base_url == "https://xdmod.access-ci.org"
        
    def test_api_token_from_env(self):
        """Test API token is read from environment"""
        with patch.dict(os.environ, {'XDMOD_API_TOKEN': 'test-token'}):
            server = XDMoDPythonServer()
            assert server.api_token == 'test-token'
    
    def test_api_token_missing(self):
        """Test server handles missing API token"""
        with patch.dict(os.environ, {}, clear=True):
            server = XDMoDPythonServer()
            assert server.api_token is None

    @pytest.mark.asyncio
    async def test_debug_auth_tool(self):
        """Test debug authentication tool"""
        # Mock the server's list_tools handler
        with patch.dict(os.environ, {'XDMOD_API_TOKEN': 'test-token-123'}):
            server = XDMoDPythonServer()
            result = await server._debug_python_auth({})
            
            assert "Authentication Status" in result
            assert "test-token-123" in result
            assert "Environment Variables" in result

    @pytest.mark.asyncio 
    async def test_debug_auth_no_token(self):
        """Test debug authentication without token"""
        with patch.dict(os.environ, {}, clear=True):
            server = XDMoDPythonServer()
            result = await server._debug_python_auth({})
            
            assert "Authentication Status" in result
            assert "Not authenticated" in result

    @pytest.mark.asyncio
    async def test_get_user_data_python_requires_params(self):
        """Test user data retrieval parameter validation"""
        server = XDMoDPythonServer()
        
        # Missing required parameters should be handled gracefully
        with pytest.raises((KeyError, ValueError)):
            await server._get_user_data_python({})

    @pytest.mark.asyncio
    async def test_get_user_data_python_with_params(self):
        """Test user data retrieval with proper parameters"""
        server = XDMoDPythonServer()
        
        # Mock requests.post to avoid real API calls
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'data': [
                {
                    'name': 'Test User',
                    'total_cpu_hours': 1000,
                    'job_count': 50
                }
            ]
        }
        
        with patch('requests.post', return_value=mock_response):
            args = {
                'user_name': 'testuser',
                'start_date': '2024-01-01',
                'end_date': '2024-01-31',
                'realm': 'Jobs',
                'statistic': 'total_cpu_hours'
            }
            
            result = await server._get_user_data_python(args)
            
            assert "User Data Analysis" in result
            assert "testuser" in result
            assert "2024-01-01" in result

    @pytest.mark.asyncio
    async def test_test_data_framework(self):
        """Test data framework testing functionality"""
        server = XDMoDPythonServer()
        
        result = await server._test_data_framework({})
        
        assert "Data Analytics Framework Test" in result
        assert "Python Environment" in result

    @pytest.mark.asyncio
    async def test_discover_person_ids(self):
        """Test person ID discovery"""
        server = XDMoDPythonServer()
        
        # Mock API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'data': [
                {'name': 'John Smith', 'id': '12345'},
                {'name': 'Jane Doe', 'id': '67890'}
            ]
        }
        
        with patch('requests.post', return_value=mock_response):
            result = await server._discover_person_ids({'limit': 20})
            
            assert "Person ID Discovery" in result
            assert "John Smith" in result
            assert "Jane Doe" in result

    @pytest.mark.asyncio
    async def test_get_dimensions(self):
        """Test dimension retrieval"""
        server = XDMoDPythonServer()
        
        # Mock API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = [
            {'id': 'Jobs_none', 'text': 'Jobs', 'group_by': 'none'},
            {'id': 'Cloud_none', 'text': 'Cloud', 'group_by': 'none'}
        ]
        
        with patch('requests.post', return_value=mock_response):
            result = await server._get_dimensions({'realm': 'Jobs'})
            
            assert "Available Dimensions" in result
            assert "Jobs" in result
            assert "Cloud" in result

    @pytest.mark.asyncio
    async def test_get_statistics(self):
        """Test statistics retrieval"""
        server = XDMoDPythonServer()
        
        # Mock API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = [
            {'id': 'total_cpu_hours', 'text': 'CPU Hours: Total'},
            {'id': 'job_count', 'text': 'Number of Jobs'}
        ]
        
        with patch('requests.post', return_value=mock_response):
            result = await server._get_statistics({'realm': 'Jobs'})
            
            assert "Available Statistics" in result
            assert "CPU Hours" in result
            assert "Number of Jobs" in result

    @pytest.mark.asyncio
    async def test_get_chart_data(self):
        """Test chart data retrieval"""
        server = XDMoDPythonServer()
        
        # Mock API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'data': [{
                'chart_title': 'Test Chart',
                'series': [
                    {'name': 'Series 1', 'data': [100, 200, 150]}
                ]
            }]
        }
        
        with patch('requests.post', return_value=mock_response):
            args = {
                'realm': 'Jobs',
                'dimension': 'person',
                'metric': 'total_cpu_hours',
                'start_date': '2024-01-01',
                'end_date': '2024-01-31'
            }
            
            result = await server._get_chart_data(args)
            
            assert "Chart Data" in result
            assert "Test Chart" in result

    @pytest.mark.asyncio
    async def test_lookup_person_id(self):
        """Test person ID lookup"""
        server = XDMoDPythonServer()
        
        # Mock API response  
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'data': [
                {'name': 'John Smith', 'id': '12345', 'match_score': 95}
            ]
        }
        
        with patch('requests.post', return_value=mock_response):
            result = await server._lookup_person_id({'search_term': 'John Smith'})
            
            assert "Person ID Lookup" in result
            assert "John Smith" in result
            assert "12345" in result

    def test_auth_headers_without_token(self):
        """Test auth headers generation without token"""
        server = XDMoDPythonServer()
        server.api_token = None
        
        headers = server._get_auth_headers()
        
        assert "Content-Type" in headers
        assert "Token" not in headers

    def test_auth_headers_with_token(self):
        """Test auth headers generation with token"""
        server = XDMoDPythonServer()
        server.api_token = "test-token"
        
        headers = server._get_auth_headers()
        
        assert headers["Token"] == "test-token"
        assert "Content-Type" in headers

    @pytest.mark.asyncio
    async def test_error_handling_api_failure(self):
        """Test error handling for API failures"""
        server = XDMoDPythonServer()
        
        # Mock failed API response
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        
        with patch('requests.post', return_value=mock_response):
            result = await server._get_dimensions({'realm': 'Jobs'})
            
            assert "Error" in result or "Failed" in result

    @pytest.mark.asyncio
    async def test_error_handling_network_error(self):
        """Test error handling for network errors"""
        server = XDMoDPythonServer()
        
        # Mock network error
        with patch('requests.post', side_effect=Exception("Network error")):
            result = await server._get_dimensions({'realm': 'Jobs'})
            
            assert "Error" in result or "Failed" in result

    def test_date_validation(self):
        """Test date format validation"""
        server = XDMoDPythonServer()
        
        # Valid dates should not raise exceptions
        valid_date = "2024-01-01"
        try:
            datetime.strptime(valid_date, "%Y-%m-%d")
        except ValueError:
            pytest.fail("Valid date should not raise ValueError")
        
        # Invalid dates should raise exceptions
        invalid_date = "01-01-2024"
        with pytest.raises(ValueError):
            datetime.strptime(invalid_date, "%Y-%m-%d")

    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """Test server handles concurrent requests"""
        server = XDMoDPythonServer()
        
        # Mock successful API response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {'data': []}
        
        with patch('requests.post', return_value=mock_response):
            # Create multiple concurrent requests
            tasks = [
                server._get_dimensions({'realm': 'Jobs'})
                for _ in range(5)
            ]
            
            results = await asyncio.gather(*tasks)
            
            assert len(results) == 5
            for result in results:
                assert isinstance(result, str)


# Integration tests (require real API access)
class TestXDMoDPythonIntegration:
    """Integration tests that make real API calls"""
    
    def setup_method(self):
        self.server = XDMoDPythonServer()
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_real_debug_auth(self):
        """Test debug authentication with real environment"""
        result = await self.server._debug_python_auth({})
        
        assert "Authentication Status" in result
        assert "Environment Variables" in result
        assert "Available Tools" in result

    @pytest.mark.integration
    @pytest.mark.asyncio 
    async def test_real_get_dimensions(self):
        """Test dimension retrieval with real API"""
        result = await self.server._get_dimensions({'realm': 'Jobs'})
        
        assert "Available Dimensions" in result
        # Should contain actual XDMoD dimensions
        assert len(result) > 100  # Real response should be substantial

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_real_framework_test(self):
        """Test data framework with real environment"""
        result = await self.server._test_data_framework({})
        
        assert "Data Analytics Framework Test" in result
        assert "Python" in result


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])