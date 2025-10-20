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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Samsung TV Controller API - Auto-Detect", version="2.0.0")

# Enable CORS
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

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

# Thread pool for concurrent operations
executor = concurrent.futures.ThreadPoolExecutor(max_workers=20)

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

@app.post("/bulk-command", response_model=BulkCommandResult)
async def execute_bulk_command(request: TVCommand):
  """Execute a command on multiple TVs concurrently"""
  logger.info(f"Bulk command request: {request.model_dump()}")
  
  if not request.ips:
      raise HTTPException(status_code=400, detail="No TV IPs provided")
  
  start_time = time.time()
  
  # Create tasks for concurrent execution
  loop = asyncio.get_event_loop()
  tasks = []
  
  for ip in request.ips:
      logger.info(f"Creating task for IP: {ip}")
      task = loop.run_in_executor(
          executor, 
          execute_command_for_tv, 
          ip, 
          request.command
      )
      tasks.append(task)
  
  # Wait for all tasks to complete
  logger.info(f"Waiting for {len(tasks)} tasks to complete...")
  results = await asyncio.gather(*tasks, return_exceptions=True)
  logger.info(f"All tasks completed. Processing {len(results)} results...")
  
  # Process results
  processed_results = []
  success_count = 0
  failure_count = 0
  
  for result in results:
      if isinstance(result, Exception):
          logger.error(f"Task exception: {result}")
          processed_results.append({
              "ip": "unknown",
              "command": request.command,
              "success": False,
              "message": f"Exception: {str(result)}",
              "response_time": 0,
              "raw_result": None
          })
          failure_count += 1
      else:
          processed_results.append(result)
          if result["success"]:
              success_count += 1
          else:
              failure_count += 1
  
  total_time = round(time.time() - start_time, 3)
  
  final_response = BulkCommandResult(
      results=processed_results,
      total_time=total_time,
      success_count=success_count,
      failure_count=failure_count
  )
  
  logger.info(f"Bulk command completed: {success_count} success, {failure_count} failed, {total_time}s total")
  return final_response


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
      "concurrent_enabled": True,
      "max_workers": executor._max_workers
  }

if __name__ == "__main__":
  import uvicorn
  uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")