"""
Efficient person search implementation to replace the current 68k+ user loading approach
"""
from typing import List, Dict, Any
from mcp.types import TextContent
import pandas as pd
import os

async def efficient_discover_person_ids(self, args: Dict[str, Any]) -> List[TextContent]:
    """Efficient person search using direct data queries (avoids loading 68k+ user list)"""
    
    search_term = args.get("search_term", "")
    limit = args.get("limit", 10)
    
    if not self.api_token:
        return [TextContent(type="text", text="❌ No API token configured")]
    
    result = f"🔍 **Efficient Person Search**\n\n"
    
    try:
        from xdmod_data.warehouse import DataWarehouse
        
        os.environ['XDMOD_API_TOKEN'] = self.api_token
        dw = DataWarehouse(xdmod_host=self.base_url)
        
        with dw:
            if search_term:
                result += f"**Searching for '{search_term}':**\n\n"
                
                # Method 1: Try exact match first
                try:
                    user_data = dw.get_data(
                        duration=('2023-01-01', '2024-12-31'),
                        realm='Jobs',
                        dimension='person',
                        metric='total_cpu_hours',
                        filters={'person': [search_term]}
                    )
                    
                    if user_data is not None and not user_data.empty:
                        result += f"✅ **Found exact match: '{search_term}'**\n"
                        if isinstance(user_data, pd.Series):
                            cpu_hours = user_data.iloc[0]
                            result += f"• **Total CPU Hours**: {cpu_hours:,.1f}\n"
                        result += f"• **Status**: Active user with job data\n"
                        return [TextContent(type="text", text=result)]
                        
                except Exception as exact_error:
                    result += f"• No exact match found\n"
                
                # Method 2: Try common variations
                variations = [
                    search_term.lower(),
                    search_term.upper(),
                    search_term.capitalize(),
                    f"{search_term.lower()}, {search_term[0].upper()}",  # "smith, S" format
                ]
                
                found_variations = []
                for variation in variations:
                    try:
                        user_data = dw.get_data(
                            duration=('2023-01-01', '2024-12-31'),
                            realm='Jobs',
                            dimension='person', 
                            metric='total_cpu_hours',
                            filters={'person': [variation]}
                        )
                        if user_data is not None and not user_data.empty:
                            found_variations.append(variation)
                            if len(found_variations) >= limit:
                                break
                    except:
                        continue
                
                if found_variations:
                    result += f"✅ **Found {len(found_variations)} variations:**\n"
                    for var in found_variations:
                        result += f"• **{var}**\n"
                else:
                    result += f"❌ **No matches found for '{search_term}'**\n\n"
                    result += f"**Search tips:**\n"
                    result += f"• Use exact usernames (e.g., 'jsmith', 'smith_j')\n"
                    result += f"• Try different capitalizations\n"
                    result += f"• User must have job data in 2023-2024 period\n"
                    result += f"• Try searching for common names like 'johnson', 'brown', 'davis'\n"
            else:
                result += f"**Usage:**\n"
                result += f"• Provide 'search_term' to find specific users\n" 
                result += f"• Search matches exact usernames only\n"
                result += f"• More efficient than loading all 68k+ users\n"
    
    except Exception as e:
        result += f"❌ **Error**: {str(e)}\n"
    
    return [TextContent(type="text", text=result)]