import polygonToLine from '@turf/polygon-to-line';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';


export function calculateDistanceToPolygon(point, polygon) {
  // Convert polygon to line
  const polygonLine = polygonToLine(polygon);
  
  // Find nearest point on the line
  const nearestPoint = nearestPointOnLine(polygonLine, point);
  
  // Calculate distance between original point and nearest point
  return distance(point, nearestPoint);
}
