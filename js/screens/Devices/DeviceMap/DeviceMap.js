/**
 * comma DeviceMap Screen
 */

import React from 'react';
import {
  Animated,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import { withNavigation, DrawerActions } from 'react-navigation';
import MapboxGL from '@react-native-mapbox-gl/maps';
import {
  multiPoint as makeMultiPoint,
} from '@turf/helpers';
import makeBbox from '@turf/bbox';
import { fetchDevices } from '../../../actions/async/Devices';
import { Assets } from '../../../constants';
import X from '../../../theme';
import Styles from './DeviceMapStyles';
import { ApiKeys } from '../../../constants';

import DeviceList from '../DeviceList/DeviceList';
import VehicleAnnotations from './VehicleAnnotations';
import VehiclePins from './VehiclePins';

MapboxGL.setAccessToken(ApiKeys.MAPBOX_TOKEN);
const ONE_WEEK_MILLIS = 7 * 86400 * 1000;

// tastefully chosen default map region
let _bbox = makeBbox(makeMultiPoint([[-122.474717, 37.689861], [-122.468134, 37.681371]]));
let DEFAULT_MAP_REGION = {
  ne: [_bbox[0], _bbox[1]],
  sw: [_bbox[2], _bbox[3]]
};

class DeviceMap extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      mapZoomed: false,
      bbox: DEFAULT_MAP_REGION,
      selectedPin: null,
      animationDuration: 200,
    };
    this.handlePressedAllVehicles = this.handlePressedAllVehicles.bind(this);
    this.handleUpdateLocationsPressed = this.handleUpdateLocationsPressed.bind(this);
    this.flyToCurrentLocation = this.flyToCurrentLocation.bind(this);
    this.resetToNorth = this.resetToNorth.bind(this);
    this.onRegionChange = this.onRegionChange.bind(this);
    this.handleMapPress = this.handleMapPress.bind(this);
    this.handleSelectedPinChange = this.handleSelectedPinChange.bind(this);
    this.handleDevicePress = this.handleDevicePress.bind(this);
    this.handleRefreshPress = this.handleRefreshPress.bind(this);

    this._compassRotate = new Animated.Value(0);
    this._compassRotateStr = this._compassRotate.interpolate({inputRange: [0,360], outputRange: ['0deg', '360deg']})
  }

  componentDidMount() {
    this.props.fetchDevices();
  }

  componentWillReceiveProps(nextProps) {
    if (!this.state.mapZoomed
      && Object.values(nextProps.devices.deviceLocations).some((location) =>
        Date.now() - location.time < ONE_WEEK_MILLIS && location.lng != null)) {
        this.setState({ mapZoomed: true });
      this.handlePressedAllVehicles(nextProps.devices.deviceLocations);
    }
  }

  handlePressedAccount() {
    this.props.navigation.dispatch(DrawerActions.toggleDrawer())
  }

  handleUpdateLocationsPressed() {
    this.props.fetchDevices();
  }

  resetToNorth() {
    this.camRef.setCamera({heading: 0, duration: 250})
  }

  renderSheetHeader() {
    const {
      devices,
      deviceLocationsUpdatedAt,
      isFetchingDeviceLocations,
    } = this.props.devices;

    if (isFetchingDeviceLocations) {
      return (
        <View style={ Styles.sheetHeader }>
          <X.Text
            color='white'
            weight='semibold'
            style={ Styles.sheetHeaderTitle }>
            Updating device locations...
          </X.Text>
        </View>
      )
    } else if (devices.length == 0) {
      return null;
    } else if (deviceLocationsUpdatedAt) {
      return (
        <View style={ Styles.sheetHeader }>
          <X.Text
            color='white'
            weight='semibold'
            style={ Styles.sheetHeaderTitle }>
            As of Today at { deviceLocationsUpdatedAt }
          </X.Text>
          <View style={ Styles.sheetHeaderAction }>
            <X.Button
              color='inverted'
              size='tiny'
              disabled={ isFetchingDeviceLocations }
              style={ Styles.sheetHeaderActionButton }
              onPress={ this.handleUpdateLocationsPressed }>
              Update Locations
            </X.Button>
          </View>
        </View>
      )
    } else {
      return null;
    }
  }

  flyToCurrentLocation() {
    if (!this.props.location.location) {
      return;
    }

    let { longitude, latitude } = this.props.location.location.coords;
    this.camRef.setCamera({ centerCoordinate: [ longitude, latitude ], zoom: 16, duration: 600 })
  }

  handleSelectedPinChange(pin) {
    this.setState({selectedPin: pin});
  }

  handlePressedAllVehicles(deviceLocations) {
    if (!deviceLocations) {
      deviceLocations = this.props.devices.deviceLocations;
    }

    const now = Date.now();
    let lnglats = Object.values(deviceLocations)
      .filter(location => now - location.time < ONE_WEEK_MILLIS && location.lng != null)
      .map(location => [location.lng, location.lat]);
    if (lnglats.length === 0) {
      return;
    }
    let bbox = makeBbox(makeMultiPoint(lnglats));
    if (Math.abs(bbox[1]-bbox[3]) < 0.5) {
      let lat = bbox[1];
      let latMetersPerDegree = 111132.954-559.822*Math.cos(2*lat)+1.175*Math.cos(4*lat);
      let lngMetersPerDegree = 111132.954*Math.cos(lat);
      if (Math.abs(bbox[0] - bbox[2]) * lngMetersPerDegree < 100) {
        bbox[0] -= 49/lngMetersPerDegree;
        bbox[2] += 49/lngMetersPerDegree;
      }
      if(Math.abs(bbox[1] - bbox[3]) * latMetersPerDegree < 100) {
        bbox[1] -= 50/latMetersPerDegree;
        bbox[3] += 50/latMetersPerDegree;
      }
    }

    this.setState({ bbox: {
      ne: [bbox[2], bbox[1]],
      sw: [bbox[0], bbox[3]]
    } });
    // Camera reference isn't available at start
    if (this.camRef !== undefined)
    {
      this.camRef.fitBounds([bbox[2], bbox[1]], [bbox[0], bbox[3]]);
    }
  }

  onRegionChange(region) {
    this._compassRotate.setValue(360 - region.properties.heading);
  }

  async handleMapPress(e) {
    const vehiclePins = await this.mapRef.queryRenderedFeaturesAtPoint([e.properties.screenPointX, e.properties.screenPointY], ['==', 'isVehiclePin', true]);
    const pins = vehiclePins.features.filter(f => f.properties && f.properties.dongleId);

    // TODO when pressing on overlapped pins, choose the top pin on selected stack
    if (pins.length !== 1 || this.state.selectedPin === pins[0].properties.dongleId) {
      this.setState({ selectedPin: null });
    } else {
      this.setState({ selectedPin: pins[0].properties.dongleId });
    }
  }

  handleDevicePress(newState, cameraArgs) {
    this.setState(newState);
    this.camRef.setCamera(cameraArgs);
  }

  handleRefreshPress() {
    this.props.fetchDevices();
  }

  async handleMapLongPress(e) {

  }

  render() {
    const { location } = this.props;
    const { user } = this.props.auth;
    const { devices, devicesDriveTimeSorted, deviceLocations } = this.props.devices;
    const areDevicesRefreshing = Object.keys(this.props.devices.activeDeviceLocationFetches).length > 0;

    return (
      <View style={ Styles.mapContainer }>
        <MapboxGL.MapView
          onDidFinishLoadingMap={ () => this.handlePressedAllVehicles() }
          onRegionWillChange={ this.onRegionChange }
          onRegionIsChanging={ this.onRegionChange }
          onRegionDidChange={ this.onRegionChange }
          styleURL={ MapboxGL.StyleURL.Dark }
          zoomLevel={ 16 }
          showUserLocation={ true }
          compassEnabled={ false }
          style={ Styles.mapView }
          onPress={ this.handleMapPress }
          ref={ ref => this.mapRef = ref }>
          <VehicleAnnotations devices={this.props.devices} selectedPin={this.state.selectedPin} onSelectedPinChange={this.handleSelectedPinChange} />
          <VehiclePins
            deviceLocations={deviceLocations}
            devicesDriveTimeSorted={devicesDriveTimeSorted}
            selectedPin={this.state.selectedPin}
            devices={devices}
            deviceLocations={deviceLocations}
          />

          <MapboxGL.Camera
            bounds={this.state.bbox}
            animationDuration={this.state.animationDuration}
            maxZoomLevel={19}
            ref={ ref => this.camRef = ref }
          />
        </MapboxGL.MapView>
        <View style={ Styles.mapHeader }>
          <X.Button
            size='full'
            color='borderless'
            style={ Styles.mapHeaderAccount }
            onPress={ () => this.handlePressedAccount() }>
            <X.Avatar
              image={ { uri: user.photo } }
              color='transparent'
              shape='circle'
              size='small'
              style={ Styles.mapHeaderAccountAvatar } />
          </X.Button>
          <View style={ Styles.mapHeaderFilter }>
            <View style={ Styles.mapHeaderFilterPill }>
              <X.Button
                color='borderless'
                size='full'
                isFlex={ true }
                style={ { flexDirection: 'column' }}
                onPress={ () => this.handlePressedAllVehicles() }>
                <X.Text
                  color='white'
                  weight='semibold'
                  style={ Styles.mapHeaderFilterTitle }>
                  All Vehicles
                </X.Text>
              </X.Button>
            </View>
          </View>
          <View style={ Styles.mapHeaderHelpers }>
            <View style={ Styles.mapHeaderHelpersInner }>
              <X.Button
                size='full'
                color='borderless'
                isFlex={true}
                onPress={ this.flyToCurrentLocation }
                style={ Styles.mapHeaderOption }>
                <X.Image
                source={ Assets.iconMyLocation }
                style={{ height: 32, width: 32 }}
              />
            </X.Button>
            <X.Button
              size='full'
              color='borderless'
              onPress={ this.resetToNorth }
              style={ Styles.mapHeaderCompass }>
              <Animated.View style={
                {
                  transform: [{
                    rotate: this._compassRotateStr
                  }]
                }
              } >
                <Assets.Compass width={ 50 } height={ 50 } />
              </Animated.View>
            </X.Button>
          </View>
        </View>
      </View>

      <DeviceList
        areDevicesRefreshing={areDevicesRefreshing}
        onPressRefresh={this.handleRefreshPress}
        devices={this.props.devices}
        navigation={this.props.navigation}
        handleDevicePress={this.handleDevicePress}
      />

      </View>
    );
  }
}

function mapStateToProps(state) {
  const { auth, devices, location } = state;
  return {
    auth,
    devices,
    location,
  };
}

function mapDispatchToProps(dispatch) {
  return ({
    fetchDevices: () => {
      dispatch(fetchDevices());
    },
  })
}

export default connect(mapStateToProps, mapDispatchToProps)(withNavigation(DeviceMap));
