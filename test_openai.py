import os
from dotenv import load_dotenv
load_dotenv()

print("Testing OpenAI client initialization...")
print("=" * 50)

try:
    import openai
    print(f"✅ OpenAI imported successfully")
    print(f"📋 OpenAI version: {openai.__version__}")
    
    # Test API key
    api_key = os.getenv("OPENAI_API_KEY", "test-key")
    print(f"🔑 API key: {'SET' if api_key and api_key != 'test-key' else 'NOT SET (using test-key)'}")
    
    print("\n🧪 Testing Client Initialization...")
    
    # Test 1: Standard initialization
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        print("✅ Standard OpenAI(api_key=...) initialization: SUCCESS")
        
        # Test a simple call (this will fail with test key but shouldn't crash on init)
        try:
            # Don't actually make the call, just test the client exists
            print(f"✅ Client type: {type(client)}")
        except Exception as call_error:
            print(f"ℹ️  Client call would fail (expected with test key): {call_error}")
            
    except TypeError as e:
        print(f"❌ Standard initialization FAILED with TypeError: {e}")
        
        if "proxies" in str(e):
            print("🔍 PROXIES ERROR DETECTED!")
            print("This is the exact error you're experiencing.")
            
            # Try workarounds
            print("\n🔧 Trying workarounds...")
            
            # Workaround 1: Legacy import
            try:
                import openai as openai_legacy
                openai_legacy.api_key = api_key
                print("✅ Legacy openai.api_key assignment: SUCCESS")
            except Exception as legacy_error:
                print(f"❌ Legacy approach failed: {legacy_error}")
                
            # Workaround 2: Empty initialization
            try:
                client = OpenAI()
                print("✅ Empty OpenAI() initialization: SUCCESS")
            except Exception as empty_error:
                print(f"❌ Empty initialization failed: {empty_error}")
                
    except Exception as e:
        print(f"❌ Standard initialization FAILED with Exception: {e}")
        
    print("\n" + "=" * 50)
    print("Test completed. Check results above.")
    
except ImportError as e:
    print(f"❌ OpenAI import failed: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}")

print("\n💡 Recommendations:")
print("1. If you see 'PROXIES ERROR DETECTED', this is the known issue")
print("2. Try: pip install openai==1.3.0  (downgrade to stable version)")
print("3. Or use test mode: LOGO_TEST_MODE=true in .env")
print("4. Or force test mode on errors: FORCE_TEST_MODE_ON_ERROR=true")
