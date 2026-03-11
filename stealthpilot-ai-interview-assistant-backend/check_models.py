"""
Check available Gemini models and their capabilities
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import google.generativeai as genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ No GEMINI_API_KEY found in .env")
        sys.exit(1)
    
    print(f"✅ Using API key: {api_key[:20]}...")
    genai.configure(api_key=api_key)
    
    print("\n" + "="*80)
    print("AVAILABLE GEMINI MODELS")
    print("="*80)
    
    models = genai.list_models()
    
    # Filter models that support generateContent (for text/vision)
    text_models = []
    vision_models = []
    
    for model in models:
        print(f"\nModel: {model.name}")
        print(f"  Display Name: {model.display_name}")
        print(f"  Description: {model.description}")
        print(f"  Supported methods: {model.supported_generation_methods}")
        print(f"  Input token limit: {model.input_token_limit}")
        print(f"  Output token limit: {model.output_token_limit}")
        
        if 'generateContent' in model.supported_generation_methods:
            if 'vision' in model.name.lower() or 'vision' in model.display_name.lower():
                vision_models.append(model.name)
                print("  ✅ VISION MODEL - Good for screenshot analysis")
            else:
                text_models.append(model.name)
                print("  ✅ TEXT MODEL - Good for audio transcription & response generation")
    
    print("\n" + "="*80)
    print("RECOMMENDATIONS FOR YOUR USE CASE")
    print("="*80)
    
    print("\n📝 TEXT MODELS (Audio transcription + Response generation):")
    for m in text_models[:5]:  # Show top 5
        print(f"  - {m}")
    
    print("\n👁️ VISION MODELS (Screenshot analysis):")
    for m in vision_models[:5]:  # Show top 5
        print(f"  - {m}")
    
    print("\n" + "="*80)
    print("RECOMMENDED CONFIGURATION")
    print("="*80)
    
    if text_models:
        recommended_text = text_models[0].replace('models/', '')
        print(f"\n✅ For audio & text: {recommended_text}")
    
    if vision_models:
        recommended_vision = vision_models[0].replace('models/', '')
        print(f"✅ For screenshots: {recommended_vision}")
    else:
        print("\n⚠️ No dedicated vision model found.")
        print("   Some text models like gemini-1.5-pro support multimodal (text + images)")
        multimodal = [m for m in text_models if '1.5' in m or 'pro' in m]
        if multimodal:
            recommended_vision = multimodal[0].replace('models/', '')
            print(f"   Try: {recommended_vision}")

except ImportError:
    print("❌ google-generativeai not installed")
    print("Run: pip install google-generativeai")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
