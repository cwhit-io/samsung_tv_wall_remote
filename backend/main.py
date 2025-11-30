from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import samsung_controller
import asyncio
import concurrent.futures
import time
import logging
import inspect
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Samsung TV Controller API - Auto-Detect", version="2.0.0")
print("FastAPI app created")

# Enable CORS
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
print("CORS enabled")

# Auto-detect function names from samsung_controller
def get_samsung_functions():
  """Auto-detect available functions in samsung_controller"""
  functions = {}
  
  # Get all functions from the module
  for name, obj in inspect.getmembers(samsung_controller):
      if inspect.isfunction(obj):
          functions[name] = obj
          logger.info(f"Found function: {name}")
  
  return functions

# Get available functions
SAMSUNG_FUNCTIONS = get_samsung_functions()
logger.info(f"Available samsung_controller functions: {list(SAMSUNG_FUNCTIONS.keys())}")
print(f"Found {len(SAMSUNG_FUNCTIONS)} functions")

# Health check endpoint for Docker
@app.get("/health")
async def health_check():
    """Health check endpoint for Docker and monitoring"""
    return {"status": "healthy", "service": "Samsung TV Controller API"}

# Pydantic models
class TVCommand(BaseModel):
  ips: List[str]
  command: str

class TVDiscovery(BaseModel):
  ip_range: str = "192.168.1.1-254"

class BulkCommandResult(BaseModel):
  results: List[Dict[str, Any]]
  total_time: float
  success_count: int
  failure_count: int

class TVInfo(BaseModel):
  ip: str
  name: str
  model: str = ""
  mac: str = ""
  token: str = ""
  paired_client_mac: str = ""

class TokenMapping(BaseModel):
  name: str
  token: str

# Thread pool for concurrent operations
# executor = concurrent.futures.ThreadPoolExecutor(max_workers=20)

def execute_command_for_tv(ip: str, command: str) -> Dict[str, Any]:
  """Execute a command for a single TV with auto-detected functions"""
  start_time = time.time()
  
  logger.info(f"Executing command '{command}' on TV {ip}")
  
  try:
      result = None
      
      # Try to find the right function based on common naming patterns
      if command == 'power-on':
          # Always prefer handle_power_on if available
          if 'handle_power_on' in SAMSUNG_FUNCTIONS:
              logger.info(f"Calling samsung_controller.handle_power_on({ip})")
              result = SAMSUNG_FUNCTIONS['handle_power_on'](ip)
          else:
              # Look for wake/power on functions
              possible_names = ['wake_tv', 'power_on_tv', 'turn_on_tv', 'wake_on_lan']
              for name in possible_names:
                  if name in SAMSUNG_FUNCTIONS:
                      logger.info(f"Calling samsung_controller.{name}({ip})")
                      result = SAMSUNG_FUNCTIONS[name](ip)
                      break
              else:
                  # If no wake function found, try KEY_POWER
                  if 'send_key' in SAMSUNG_FUNCTIONS:
                      result = SAMSUNG_FUNCTIONS['send_key'](ip, 'KEY_POWER')
                  elif 'send_command' in SAMSUNG_FUNCTIONS:
                      result = SAMSUNG_FUNCTIONS['send_command'](ip, 'KEY_POWER')
                  
      elif command == 'power-off':
          # For power off, always use KEY_POWER
          possible_names = ['send_key', 'send_command', 'send_key_to_tv', 'execute_command']
          for name in possible_names:
              if name in SAMSUNG_FUNCTIONS:
                  logger.info(f"Calling samsung_controller.{name}({ip}, KEY_POWER)")
                  result = SAMSUNG_FUNCTIONS[name](ip, 'KEY_POWER')
                  break
                  
      elif command == 'discover':
          # Look for discover functions
          possible_names = ['discover_tv', 'discover', 'find_tv', 'scan_tv']
          for name in possible_names:
              if name in SAMSUNG_FUNCTIONS:
                  logger.info(f"Calling samsung_controller.{name}({ip})")
                  result = SAMSUNG_FUNCTIONS[name](ip)
                  break
                  
      else:
          # For all other commands, try to find send key function
          possible_names = ['send_key', 'send_command', 'send_key_to_tv', 'execute_command']
          for name in possible_names:
              if name in SAMSUNG_FUNCTIONS:
                  logger.info(f"Calling samsung_controller.{name}({ip}, {command})")
                  result = SAMSUNG_FUNCTIONS[name](ip, command)
                  break
      
      if result is None:
          raise Exception(f"No suitable function found for command: {command}")
          
      logger.info(f"Function result: {result}")
      response_time = round(time.time() - start_time, 3)
      
      # Handle the result format from your functions
      if isinstance(result, dict):
          success = result.get("success", False)
          message = result.get("message", "Unknown result")
      elif isinstance(result, bool):
          success = result
          message = "Command executed" if success else "Command failed"
      else:
          # Handle other result types
          success = bool(result) if result is not None else False
          message = f"Result: {result}"
      
      final_result = {
          "ip": ip,
          "command": command,
          "success": success,
          "message": message,
          "response_time": response_time,
          "raw_result": str(result)
      }
      
      logger.info(f"Final result for {ip}: {final_result}")
      return final_result
      
  except Exception as e:
      response_time = round(time.time() - start_time, 3)
      error_result = {
          "ip": ip,
          "command": command,
          "success": False,
          "message": f"Error: {str(e)}",
          "response_time": response_time,
          "raw_result": None
      }
      logger.error(f"Exception for {ip}: {e}")
      return error_result

@app.get("/")
async def root():
  return {
      "message": "Samsung TV Controller API v2.0 - Auto-Detect Mode",
      "detected_functions": list(SAMSUNG_FUNCTIONS.keys())
  }

@app.get("/functions")
async def get_functions():
  """Get all detected functions from samsung_controller"""
  return {
      "functions": list(SAMSUNG_FUNCTIONS.keys()),
      "function_details": {
          name: {
              "signature": str(inspect.signature(func)),
              "doc": inspect.getdoc(func)
          }
          for name, func in SAMSUNG_FUNCTIONS.items()
      }
  }

@app.get("/tvs")
async def get_tvs():
  """Get all discovered TVs"""
  try:
      # Try different possible function names
      possible_names = ['load_tv_info', 'get_tv_info', 'load_tvs', 'get_tvs']
      for name in possible_names:
          if name in SAMSUNG_FUNCTIONS:
              tv_info = SAMSUNG_FUNCTIONS[name]()
              logger.info(f"Loaded TV info using {name}: {tv_info}")
              return {"tvs": tv_info.get("tvs", {}) if isinstance(tv_info, dict) else {}}
      
      return {"tvs": {}, "error": "No TV info function found"}
  except Exception as e:
      logger.error(f"Error loading TV info: {e}")
      return {"tvs": {}, "error": str(e)}

@app.get("/commands")
async def get_available_commands():
  """Get all available commands"""
  try:
      # Try different possible function names
      possible_names = ['load_tv_keys', 'get_tv_keys', 'load_keys', 'get_keys', 'get_commands']
      for name in possible_names:
          if name in SAMSUNG_FUNCTIONS:
              keys = SAMSUNG_FUNCTIONS[name]()
              logger.info(f"Loaded commands using {name}: {list(keys.keys()) if isinstance(keys, dict) else keys}")
              return {"commands": list(keys.keys()) if isinstance(keys, dict) else keys}
      
      # Return common Samsung TV keys if no function found
      common_keys = [
          "KEY_POWER", "KEY_VOLUP", "KEY_VOLDOWN", "KEY_MUTE",
          "KEY_CHUP", "KEY_CHDOWN", "KEY_UP", "KEY_DOWN", 
          "KEY_LEFT", "KEY_RIGHT", "KEY_ENTER", "KEY_RETURN",
          "KEY_HOME", "KEY_MENU", "KEY_SOURCE", "KEY_INFO"
      ]
      return {"commands": common_keys, "note": "Using common keys - no key function found"}
  except Exception as e:
      logger.error(f"Error loading commands: {e}")
      return {"commands": [], "error": str(e)}

@app.get("/keys")
async def get_keys():
  """Get all key mappings"""
  try:
      if 'load_tv_keys' in SAMSUNG_FUNCTIONS:
          keys = SAMSUNG_FUNCTIONS['load_tv_keys']()
          return {"keys": keys}
      return {"keys": {}, "error": "No key loading function found"}
  except Exception as e:
      logger.error(f"Error loading keys: {e}")
      return {"keys": {}, "error": str(e)}

@app.post("/tvs")
async def add_tv(tv: TVInfo):
  """Add a new TV"""
  try:
      if 'load_tv_info' in SAMSUNG_FUNCTIONS:
          tv_info = SAMSUNG_FUNCTIONS['load_tv_info']()
          if tv.ip in tv_info.get("tvs", {}):
              raise HTTPException(status_code=400, detail="TV with this IP already exists")
          
          tv_info["tvs"][tv.ip] = {
              "name": tv.name,
              "model": tv.model,
              "mac": tv.mac,
              "token": tv.token,
              "paired_client_mac": tv.paired_client_mac,
              "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
          }
          
          if 'save_tv_info' in SAMSUNG_FUNCTIONS:
              SAMSUNG_FUNCTIONS['save_tv_info'](tv_info)
          
          return {"message": "TV added successfully", "tv": tv_info["tvs"][tv.ip]}
      raise HTTPException(status_code=500, detail="TV info functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error adding TV: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.put("/tvs/{ip}")
async def update_tv(ip: str, tv: TVInfo):
  """Update an existing TV"""
  try:
      if 'load_tv_info' in SAMSUNG_FUNCTIONS:
          tv_info = SAMSUNG_FUNCTIONS['load_tv_info']()
          if ip not in tv_info.get("tvs", {}):
              raise HTTPException(status_code=404, detail="TV not found")
          
          tv_info["tvs"][ip].update({
              "name": tv.name,
              "model": tv.model,
              "mac": tv.mac,
              "token": tv.token,
              "paired_client_mac": tv.paired_client_mac,
              "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
          })
          
          if 'save_tv_info' in SAMSUNG_FUNCTIONS:
              SAMSUNG_FUNCTIONS['save_tv_info'](tv_info)
          
          return {"message": "TV updated successfully", "tv": tv_info["tvs"][ip]}
      raise HTTPException(status_code=500, detail="TV info functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error updating TV: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.delete("/tvs/{ip}")
async def delete_tv(ip: str):
  """Delete a TV"""
  try:
      if 'load_tv_info' in SAMSUNG_FUNCTIONS:
          tv_info = SAMSUNG_FUNCTIONS['load_tv_info']()
          if ip not in tv_info.get("tvs", {}):
              raise HTTPException(status_code=404, detail="TV not found")
          
          deleted_tv = tv_info["tvs"].pop(ip)
          
          if 'save_tv_info' in SAMSUNG_FUNCTIONS:
              SAMSUNG_FUNCTIONS['save_tv_info'](tv_info)
          
          return {"message": "TV deleted successfully", "tv": deleted_tv}
      raise HTTPException(status_code=500, detail="TV info functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error deleting TV: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.post("/keys")
async def add_key(key_mapping: KeyMapping):
  """Add a new key mapping"""
  try:
      if 'load_tv_keys' in SAMSUNG_FUNCTIONS and 'save_tv_keys' in SAMSUNG_FUNCTIONS:
          keys = SAMSUNG_FUNCTIONS['load_tv_keys']()
          if key_mapping.name in keys:
              raise HTTPException(status_code=400, detail="Key with this name already exists")
          
          keys[key_mapping.name] = key_mapping.key
          SAMSUNG_FUNCTIONS['save_tv_keys'](keys)
          
          return {"message": "Key added successfully", "key": {key_mapping.name: key_mapping.key}}
      raise HTTPException(status_code=500, detail="Key functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error adding key: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.put("/keys/{key_name}")
async def update_key(key_name: str, key_mapping: KeyMapping):
  """Update an existing key mapping"""
  try:
      if 'load_tv_keys' in SAMSUNG_FUNCTIONS and 'save_tv_keys' in SAMSUNG_FUNCTIONS:
          keys = SAMSUNG_FUNCTIONS['load_tv_keys']()
          if key_name not in keys:
              raise HTTPException(status_code=404, detail="Key not found")
          
          keys[key_name] = key_mapping.key
          SAMSUNG_FUNCTIONS['save_tv_keys'](keys)
          
          return {"message": "Key updated successfully", "key": {key_name: key_mapping.key}}
      raise HTTPException(status_code=500, detail="Key functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error updating key: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.get("/tokens")
async def get_tokens():
  """Get all token mappings"""
  try:
      if 'load_tv_tokens' in SAMSUNG_FUNCTIONS:
          tokens = SAMSUNG_FUNCTIONS['load_tv_tokens']()
          return {"tokens": tokens}
      return {"tokens": {}, "error": "No token loading function found"}
  except Exception as e:
      logger.error(f"Error loading tokens: {e}")
      return {"tokens": {}, "error": str(e)}

@app.post("/tokens")
async def add_token(token_mapping: TokenMapping):
  """Add a new token mapping"""
  try:
      if 'load_tv_tokens' in SAMSUNG_FUNCTIONS and 'save_tv_tokens' in SAMSUNG_FUNCTIONS:
          tokens = SAMSUNG_FUNCTIONS['load_tv_tokens']()
          if token_mapping.name in tokens:
              raise HTTPException(status_code=400, detail="Token with this name already exists")
          
          tokens[token_mapping.name] = token_mapping.token
          SAMSUNG_FUNCTIONS['save_tv_tokens'](tokens)
          
          return {"message": "Token added successfully", "token": {token_mapping.name: token_mapping.token}}
      raise HTTPException(status_code=500, detail="Token functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error adding token: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.put("/tokens/{token_name}")
async def update_token(token_name: str, token_mapping: TokenMapping):
  """Update an existing token mapping"""
  try:
      if 'load_tv_tokens' in SAMSUNG_FUNCTIONS and 'save_tv_tokens' in SAMSUNG_FUNCTIONS:
          tokens = SAMSUNG_FUNCTIONS['load_tv_tokens']()
          if token_name not in tokens:
              raise HTTPException(status_code=404, detail="Token not found")
          
          tokens[token_name] = token_mapping.token
          SAMSUNG_FUNCTIONS['save_tv_tokens'](tokens)
          
          return {"message": "Token updated successfully", "token": {token_name: token_mapping.token}}
      raise HTTPException(status_code=500, detail="Token functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error updating token: {e}")
      raise HTTPException(status_code=500, detail=str(e))

@app.delete("/tokens/{token_name}")
async def delete_token(token_name: str):
  """Delete a token mapping"""
  try:
      if 'load_tv_tokens' in SAMSUNG_FUNCTIONS and 'save_tv_tokens' in SAMSUNG_FUNCTIONS:
          tokens = SAMSUNG_FUNCTIONS['load_tv_tokens']()
          if token_name not in tokens:
              raise HTTPException(status_code=404, detail="Token not found")
          
          deleted_token = {token_name: tokens.pop(token_name)}
          SAMSUNG_FUNCTIONS['save_tv_tokens'](tokens)
          
          return {"message": "Token deleted successfully", "token": deleted_token}
      raise HTTPException(status_code=500, detail="Token functions not available")
  except HTTPException:
      raise
  except Exception as e:
      logger.error(f"Error deleting token: {e}")
      raise HTTPException(status_code=500, detail=str(e))


@app.get("/debug/{ip}")
async def debug_tv_connection(ip: str):
  """Detailed debug information for a TV"""
  logger.info(f"Debug test for IP: {ip}")
  
  debug_info = {
      "ip": ip,
      "timestamp": time.time(),
      "available_functions": list(SAMSUNG_FUNCTIONS.keys()),
      "tests": {}
  }
  
  # Test each available function that might work with a single IP
  for func_name, func in SAMSUNG_FUNCTIONS.items():
      try:
          # Get function signature to see how many parameters it takes
          sig = inspect.signature(func)
          params = list(sig.parameters.keys())
          
          if len(params) == 1:
              # Single parameter function - try with IP
              logger.info(f"Testing {func_name} with IP only...")
              result = func(ip)
              debug_info["tests"][func_name] = {
                  "parameters": "ip_only",
                  "result": result,
                  "type": type(result).__name__,
                  "success": True
              }
          elif len(params) == 2:
              # Two parameter function - try with IP and a test command
              logger.info(f"Testing {func_name} with IP and KEY_VOLUP...")
              result = func(ip, "KEY_VOLUP")
              debug_info["tests"][func_name] = {
                  "parameters": "ip_and_command",
                  "result": result,
                  "type": type(result).__name__,
                  "success": True
              }
          else:
              debug_info["tests"][func_name] = {
                  "parameters": f"too_many_params_{len(params)}",
                  "skipped": True
              }
              
      except Exception as e:
          debug_info["tests"][func_name] = {
              "error": str(e),
              "success": False
          }
          logger.error(f"{func_name} error: {e}")
  
  return debug_info

@app.get("/health")
async def health_check():
  return {
      "status": "healthy",
      "auto_detect_mode": True,
      "detected_functions": len(SAMSUNG_FUNCTIONS),
      "function_names": list(SAMSUNG_FUNCTIONS.keys()),
      "concurrent_enabled": False,
      "max_workers": 0
  }

# if __name__ == "__main__":
#   import uvicorn
#   print("Starting server...")
#   uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")