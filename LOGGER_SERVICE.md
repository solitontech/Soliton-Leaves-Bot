# Logger Service Implementation

## Overview
Created a centralized logger service to standardize all logging operations across the Soliton Leaves Bot application.

## What Was Done

### 1. Created Logger Service
**File**: `server/services/loggerService.js`

A comprehensive logging service with the following features:
- **Basic logging methods**: `info()`, `error()`, `warn()`, `debug()`
- **Utility methods**: `separator()`, `section()`
- **Domain-specific methods**: Specialized logging functions for different parts of the application
  - Graph API notifications
  - Email parsing
  - GreytHR integration
  - Leave application processing
  - Server startup

### 2. Refactored All Files

Replaced all `console.log`, `console.error`, and `console.warn` calls with logger service methods:

#### Updated Files:
1. ✅ **server/server.js** - Main server file
2. ✅ **server/email-parser-service/emailParser.js** - Email parsing service
3. ✅ **server/greytHr-service/greytHrAuth.js** - GreytHR authentication
4. ✅ **server/greytHr-service/greytHrClient.js** - GreytHR API client
5. ✅ **server/greytHr-service/leaveApplicationService.js** - Leave application processing
6. ✅ **graph-authentication/subscribe.js** - Mailbox subscription script

## Benefits

### Current Benefits
- **Consistency**: All logging follows the same pattern
- **Maintainability**: Easy to update logging behavior in one place
- **Readability**: Semantic method names make code more self-documenting

### Future Extensibility
The logger service can easily be extended to support:
- **File logging**: Write logs to files
- **Log levels**: Control verbosity (DEBUG, INFO, WARN, ERROR)
- **External services**: Send logs to services like Datadog, Splunk, CloudWatch
- **Structured logging**: JSON-formatted logs for better parsing
- **Log rotation**: Automatic log file management
- **Filtering**: Filter logs by module or severity
- **Performance metrics**: Track timing and performance data

## Usage Examples

### Basic Logging
```javascript
import logger from "./services/loggerService.js";

logger.info("Server started successfully");
logger.error("Failed to connect to database", error);
logger.warn("API rate limit approaching");
```

### Domain-Specific Logging
```javascript
// Graph notifications
logger.graphNotificationReceived();
logger.graphValidationRequest(token);

// Email parsing
logger.parsingEmailFrom(email);
logger.validLeaveRequestParsed(leaveRequest);

// GreytHR integration
logger.greytHRAuthenticating();
logger.employeeFound(name);
logger.leaveApplicationSuccess(applicationId);

// Server startup
logger.serverStartup(443, publicUrl, true, certPath);
```

### Formatted Output
```javascript
// Section headers
logger.section("Processing Leave Application");

// Separators
logger.separator(60);

// Complex summaries
logger.leaveApplicationSuccessSummary(employeeName, employeeNo, leaveRequest);
```

## Implementation Details

### Logger Class Structure
```javascript
class LoggerService {
    // Basic methods
    info(message, data)
    error(message, error)
    warn(message, data)
    debug(message, data)
    
    // Utility methods
    separator(length)
    section(title, length)
    
    // Domain-specific methods
    graphNotificationReceived()
    parsingLeaveRequest()
    greytHRAuthenticating()
    leaveApplicationSuccess(applicationId)
    // ... and many more
}
```

### Singleton Pattern
The logger is exported as a singleton instance:
```javascript
const logger = new LoggerService();
export default logger;
```

This ensures consistent logging across all modules without creating multiple instances.

## Future Enhancements

### Recommended Next Steps

1. **Add Log Levels**
   ```javascript
   const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
   let currentLevel = LOG_LEVELS.INFO;
   ```

2. **Add File Logging**
   ```javascript
   import fs from 'fs';
   
   writeToFile(level, message) {
       const logEntry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
       fs.appendFileSync('./logs/app.log', logEntry);
   }
   ```

3. **Add Structured Logging**
   ```javascript
   logStructured(level, message, metadata) {
       const logObject = {
           timestamp: new Date().toISOString(),
           level,
           message,
           ...metadata
       };
       console.log(JSON.stringify(logObject));
   }
   ```

4. **Add External Service Integration**
   ```javascript
   async sendToDatadog(log) {
       await axios.post('https://http-intake.logs.datadoghq.com/v1/input', log);
   }
   ```

5. **Add Performance Tracking**
   ```javascript
   startTimer(label) {
       this.timers[label] = Date.now();
   }
   
   endTimer(label) {
       const duration = Date.now() - this.timers[label];
       this.info(`${label} completed in ${duration}ms`);
   }
   ```

## Migration Complete ✅

All console.log calls have been successfully migrated to the logger service. The application now has a solid foundation for enhanced logging capabilities in the future.
