#!/usr/bin/env python3

"""Test just the CSV parsing logic without full MCP server"""

import csv
import html

def test_csv_parsing():
    # Sample CSV response that would cause the pandas error
    sample_csv = '''title
"CPU Hours: Total: by System Username"
parameters
"System Username =  apasquale"
"*Restricted To: User = Pasquale, A"
start,end
2025-01-01,2025-12-31
---------
"System Username","CPU Hours: Total"
apasquale,23.6156
---------
'''
    
    print("🧪 Testing CSV parsing fix...")
    print("Sample CSV:")
    print(sample_csv)
    print("\n" + "="*50 + "\n")
    
    # Test our parsing logic
    csv_reader = csv.reader(sample_csv.splitlines())
    data_rows = []
    
    for line_num, line in enumerate(csv_reader):
        if line_num > 7 and len(line) > 1:
            print(f"Line {line_num}: {line}")
            # Skip header row that contains metric name
            if line[1] == 'CPU Hours: Total' or 'CPU Hours: Total' in line[1]:
                print(f"  -> Skipping header row")
                continue
            # Process data row
            username = html.unescape(line[0])
            try:
                value = float(line[1])
                data_rows.append((username, value))
                print(f"  -> Found data: {username} = {value}")
            except ValueError as e:
                print(f"  -> Could not parse value '{line[1]}': {e}")
    
    print(f"\nResults:")
    print(f"Found {len(data_rows)} data rows")
    if data_rows:
        user_data = {row[0]: row[1] for row in data_rows}
        print(f"User data: {user_data}")
        
        # Test the display logic
        access_id = "apasquale"
        statistic = "total_cpu_hours"
        start_date = "2025-01-01"
        end_date = "2025-12-31"
        
        print(f"\n**✅ Found usage data for ACCESS ID '{access_id}':**")
        total_value = 0
        for username, value in user_data.items():
            print(f"• **{username}**: {value} {statistic}")
            total_value += value
        
        print(f"\n**Summary:**")
        print(f"• Total {statistic}: {total_value}")
        print(f"• Period: {start_date} to {end_date}")
        print(f"• User: {access_id} ({', '.join(user_data.keys())})")
        
        print("\n✅ SUCCESS: CSV parsing works correctly!")
    else:
        print("❌ FAILED: No data rows found")

if __name__ == "__main__":
    test_csv_parsing()