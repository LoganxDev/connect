// libs
import React from 'react';
import MapboxGL from '@react-native-mapbox-gl/maps';

// local
import { deviceTitle } from '../../../utils/device';
import { Assets } from '../../../constants';

const ONE_WEEK_MILLIS = 7 * 86400 * 1000;

const mapStyles = {
  vehiclePin: {
      iconAnchor: MapboxGL.IconAnchor.Bottom,
      iconImage: Assets.iconPinParked,
      iconSize: __DEV__ ? 0.75 : 0.25,
    },
};

const VehiclePins = (props) => {
  const devices = props.devices;
  const selectedPin = props.selectedPin;
  const now = Date.now();
  const locEntries = props.devicesDriveTimeSorted
    .map(dongleId => [dongleId, props.deviceLocations[dongleId]])
    .filter(([dongleId, location]) => location !== undefined && dongleId !== selectedPin && now - location.time < ONE_WEEK_MILLIS);
  if (selectedPin && props.deviceLocations[selectedPin]) {
    locEntries.push([selectedPin, props.deviceLocations[selectedPin]]);
  }
  return (
    locEntries.map(([dongleId, location]) => {
      const device = devices[dongleId];
      if (!device) {
        console.warn('device location but no device', dongleId);
        return null;
      }
      if (location.lng) {
        const title = deviceTitle(device);
        const shape = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
              title: selectedPin===dongleId ? title : '',
              dongleId,
              isVehiclePin: true,
              },
              geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat],
              },
            },
          ]
        };

        return (
          <MapboxGL.ShapeSource
              id={ 'vehiclePin_' + dongleId }
              key={ 'vehiclePin_' + dongleId }
              shape={ shape }>
              <MapboxGL.SymbolLayer id={ 'vehiclePin_' + dongleId } style={ mapStyles.vehiclePin } />
          </MapboxGL.ShapeSource>
        )
      } else {
        return null;
      }
    })
  )
}

export default VehiclePins;