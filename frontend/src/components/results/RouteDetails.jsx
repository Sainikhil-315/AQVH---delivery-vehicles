// import React from 'react'
// import { Truck, MapPin, ArrowRight } from 'lucide-react'
// import Card from '../ui/Card'
// import Badge from '../ui/Badge'
// import { getRouteColors } from '../../utils/mapUtils'

// const RouteDetails = ({ routes = [] }) => {
//   const colors = getRouteColors(routes.length)

//   const calculateRouteDistance = (route) => {
//     // This is a simplified distance calculation
//     // In practice, this would use the actual distance matrix
//     return route.length * 2.5 + Math.random() * 3
//   }

//   return (
//     <Card>
//       <Card.Header>
//         <div className="flex items-center space-x-2">
//           <Truck className="h-5 w-5 text-primary-600" />
//           <h3 className="text-lg font-medium">Route Details</h3>
//           <Badge variant="default">{routes.length} vehicles</Badge>
//         </div>
//       </Card.Header>

//       <Card.Content>
//         <div className="space-y-4">
//           {routes.map((route, index) => {
//             const routeDistance = calculateRouteDistance(route)
//             const routeColor = colors[index]

//             return (
//               <div
//                 key={index}
//                 className="p-4 border-l-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
//                 style={{ borderLeftColor: routeColor }}
//               >
//                 <div className="flex items-center justify-between mb-3">
//                   <div className="flex items-center space-x-2">
//                     <Truck 
//                       className="h-5 w-5" 
//                       style={{ color: routeColor }}
//                     />
//                     <h4 className="font-medium text-gray-900 dark:text-gray-100">
//                       Vehicle {index + 1}
//                     </h4>
//                   </div>
                  
//                   <div className="text-right">
//                     <p className="text-sm text-gray-500 dark:text-gray-400">
//                       Distance: {routeDistance.toFixed(2)} km
//                     </p>
//                     <p className="text-sm text-gray-500 dark:text-gray-400">
//                       Stops: {route.length}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="flex items-center space-x-2 flex-wrap">
//                   {route.map((locationIndex, stopIndex) => (
//                     <React.Fragment key={stopIndex}>
//                       <div className="flex items-center space-x-1">
//                         <MapPin 
//                           className={`h-4 w-4 ${
//                             locationIndex === 0 ? 'text-red-500' : 'text-blue-500'
//                           }`}
//                         />
//                         <span className="text-sm font-medium">
//                           {locationIndex === 0 ? 'Depot' : `Customer ${locationIndex}`}
//                         </span>
//                       </div>
                      
//                       {stopIndex < route.length - 1 && (
//                         <ArrowRight className="h-4 w-4 text-gray-400" />
//                       )}
//                     </React.Fragment>
//                   ))}
//                 </div>

//                 <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
//                   <div className="grid grid-cols-3 gap-4 text-sm">
//                     <div>
//                       <span className="text-gray-500 dark:text-gray-400">Customers:</span>
//                       <span className="ml-1 font-medium">
//                         {route.filter(loc => loc !== 0).length}
//                       </span>
//                     </div>
//                     <div>
//                       <span className="text-gray-500 dark:text-gray-400">Load:</span>
//                       <span className="ml-1 font-medium">
//                         {((route.length - 1) / routes.length * 100).toFixed(0)}%
//                       </span>
//                     </div>
//                     <div>
//                       <span className="text-gray-500 dark:text-gray-400">Efficiency:</span>
//                       <Badge 
//                         size="sm" 
//                         variant={routeDistance < 8 ? 'success' : routeDistance < 15 ? 'warning' : 'danger'}
//                       >
//                         {routeDistance < 8 ? 'High' : routeDistance < 15 ? 'Medium' : 'Low'}
//                       </Badge>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )
//           })}
//         </div>

//         {routes.length === 0 && (
//           <div className="text-center py-8">
//             <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//             <p className="text-gray-500 dark:text-gray-400">
//               No routes available
//             </p>
//           </div>
//         )}
//       </Card.Content>
//     </Card>
//   )
// }

// export default RouteDetails


import React from 'react'
import { MapPin, Navigation } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

const RouteDetails = ({ routes = [] }) => {
  if (!routes || routes.length === 0) {
    return (
      <Card>
        <Card.Content className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No routes available</p>
        </Card.Content>
      </Card>
    )
  }

  const calculateRouteDistance = (route) => {
    // Simple distance calculation - replace with your actual logic
    return route.length * 2.5 + Math.random() * 3
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center space-x-2">
          <Navigation className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium">Route Details</h3>
        </div>
      </Card.Header>

      <Card.Content>
        <div className="space-y-4">
          {routes.map((route, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Vehicle {index + 1}
                  </h4>
                </div>
                <Badge variant="outline" size="sm">
                  {route.length} stops
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Distance:</span>
                  <p className="font-medium">{calculateRouteDistance(route).toFixed(2)} km</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Stops:</span>
                  <p className="font-medium">{route.length}</p>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Route:</span>
                <p className="font-mono text-sm mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  {route.join(' → ')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {routes.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Vehicles</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {routes.reduce((total, route) => total + route.length, 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Stops</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {routes.reduce((total, route) => total + calculateRouteDistance(route), 0).toFixed(1)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Distance (km)</p>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

export default RouteDetails