/**
 * Middleware for automatic formatting API responses
 * - Replaces _id with id for compatibility with Django
 * - Formats dates from ISO to datetime format
 */

const formatResponse = require('../utils/formatResponse');

/**
 * Overrides the res.json method for automatic formatting responses
 */
function responseFormatter(req, res, next) {
  // Saves the original json method
  const originalJson = res.json;
  
  // Overrides the json method for automatic formatting
  res.json = function(data) {
    // Skips formatting for error messages and simple responses
    if (
      !data || 
      typeof data !== 'object' || 
      (data.message && Object.keys(data).length === 1) ||
      data.error
    ) {
      // console.log('[ResponseFormatter] Skipping formatting for simple response', 
      //   typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : typeof data);
      return originalJson.call(this, data);
    }
    
    try {
      // Formats the data
      const formattedData = formatResponse(data);
      
      // Logs for debugging (commented out for production)
      // console.log('[ResponseFormatter] Formatting applied:', 
      //  `Path: ${req.path}, Data type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
      
      // Calls the original method with formatted data
      return originalJson.call(this, formattedData);
    } catch (error) {
      console.error('[ResponseFormatter] Formatting error:', error);
      // If there's an error, returns the original data
      return originalJson.call(this, data);
    }
  };
  
  next();
}

module.exports = responseFormatter; 