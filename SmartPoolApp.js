require('node-libs-react-native/globals');

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  YellowBox,
} from 'react-native';

import moment from 'moment';
import 'moment-timezone';

import { COLOR, ThemeProvider, Button } from 'react-native-material-ui';
import darkBaseTheme from './darkBaseTheme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FaIconToggle from 'react-native-vector-icons/FontAwesome';
import awsIot from 'aws-iot-device-sdk';
import { Auth } from 'aws-amplify';
import Modal from 'react-native-modal';
import DateTimePicker from 'react-native-modal-datetime-picker'

// Warnings I can't do anything about
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader']);
YellowBox.ignoreWarnings(['Setting a timer']);
YellowBox.ignoreWarnings(['Remote debugger is in a background tab']);

const { iotLogin } = require("./aws/cred.json");
const { weatherLogin } = require("./aws/cred.json");

var Color = require('color');
var isUndefined = require('aws-iot-device-sdk/common/lib/is-undefined')

export default class SmartPoolApp extends Component<{}> {
	static navigationOptions = {
    // title: 'SmartPoolApp',
    headerStyle: { backgroundColor: 'black' },
    headerTitleStyle: { color: 'white' }
	};

  constructor(props) {
      super(props);
      this.state = {
        time: '',
        pumpButton: false,
        isConnectedToThingShadow: false,
        isVisibleTimerModal: false,
        isStartDailyTimePickerVisible: false,
        isStopDailyTimePickerVisible: false,
        timerMode: 'timer',
        deviceId: '',
        device: {
          volt: null,
          cur: null,
          pow: null,
          temp: null,
          press: null,
          auto: null,
          relay: null,
          timer: {
            start: '',
            stop: '',
          },
          schedule: {
            start: '',
            stop: '',
          },
          ip:''
        }
      };
      this.configureIotDevice = this.configureIotDevice.bind(this);
      this.myDeviceShadow = null;
  }

  componentWillMount() {
    this.setState({
      isVisibleTimerModal: false,
      isStartDailyTimePickerVisible: false,
      isStopDailyTimePickerVisible: false,
    });
  }

  componentDidMount() {
    this.Clock = setInterval( () => this.displayTime(), 1000 );
    this.setState({
      deviceId: this.props.navigation.state.params.device_id,
    });
    this.myDeviceShadow = this.configureIotDevice();
    this.getLocation();
  }

  componentWillUnmount(){
    clearInterval(this.Clock);
  }

  componentWillReceiveProps() {
    this.setState({
      setTime: this.props.navigation.state.params.setTime,
    });
    console.log("componentWillReceiveProps: ", this.props);
  }

  capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);

  displayTime() {
    // this.setState({ time: moment.tz(timezoneformat).format(yourdesiredformat)})
    // moment().format('MMMM Do YYYY, h:mm:ss a')
    const now = moment().format('LLLL');
    this.setState({ time: now});
  }

  getLocation() {

    console.log('getting location...');
    let ip = '';

    // Get IP from external source
    const ipURL = 'https://api.ipify.org?format=json';
    const myRequest = {
      method: 'GET',
      headers: {'Content-Type': 'application/json'},
      mode: 'cors',
    };
    fetch(ipURL, myRequest)
    .then(response => {
      if (response.ok) {
        response.json().then((response) => {
          // console.log("ip: ", response);
          ip = response.ip;
        })
      }
    })
    .catch(error => console.log(error));

    // Using Ip address, get location from IP
    const apiURL = 'http://ip-api.com/json/' + ip; // example "74.104.126.95"
    fetch(apiURL, myRequest)
      .then(response => {
        if (response.ok) {
          response.json().then((response) => {
            console.log("response ", response);
            this.myDeviceLocation = response;
            this.getWeather();
          })
        }
      })
      .catch(error => console.log(error));

  }

  // Function to get Weather information
  getWeather() {
		const urlParam ={
			lat: this.myDeviceLocation.lat,
			lon: this.myDeviceLocation.lon,
      APPID: weatherLogin.APPID,
		};
    const querystring = Object.keys(urlParam)
      .map(key => key + '=' + encodeURIComponent(urlParam[key]))
      .join('&');

    const apiURL = 'https://api.openweathermap.org/data/2.5/weather?' + querystring;
    // console.log('weather URL: ', apiURL);

    const myRequest = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors',
    };

    console.log("In getWeather");
    fetch(apiURL, myRequest)
    .then((response) => {
      // console.log("first response: ", response);
      if (response.ok) {
        response.json().then((response) => {
          console.log('weather data: ', response);
          this.myDeviceWeather = response;
        })
        .catch(error => console.log(error));
      }
    })
    .catch(error => console.log(error));
  }

  onPumpButtonPressed = () => {
    this.setState({pumpButton: !this.state.pumpButton},
      this.handleShadowUpdate({relay: Number(this.state.pumpButton)}));
  }

  setVisibleTimerModal(visible) {
    this.setState({isVisibleTimerModal: visible});
  }

  _handleSetSchedule = () => {
    if (this.state.timerMode === 'timer') {
      this.handleShadowUpdate({timer: this.state.device.timer});
    }
    else {
      this.handleShadowUpdate({schedule: this.state.device.schedule});
    }    
    this.setVisibleTimerModal(false);
  }

  _closeModal = () => {
    this.setVisibleTimerModal(false);
  }

  _showStartDailyTimePicker = () => this.setState({ isStartDailyTimePickerVisible: true });

  _hideStartDailyTimePicker = () => this.setState({ isStartDailyTimePickerVisible: false });

  _showStopDailyTimePicker = () => this.setState({ isStopDailyTimePickerVisible: true });

  _hideStopDailyTimePicker = () => this.setState({ isStopDailyTimePickerVisible: false });

  _handleDailyStartTimePicked = (stime) => {
    const newObject = Object.assign({}, this.state.device);
    if (this.state.timerMode === 'timer') {
      const newTimerObject = Object.assign(this.state.device.timer, {start: moment(stime).format('X')});
      newObject.timer = newTimerObject;
      this.setState({device: newObject}, console.log("timer :", this.state.device.timer));  
    }
    else {  
      const newTimerObject = Object.assign(this.state.device.schedule, {start: moment(stime).format('X')});
      newObject.schedule = newTimerObject;
      this.setState({device: newObject}, console.log("schedule :", this.state.device.schedule));
    }
    this._hideStartDailyTimePicker();
  };

  _handleDailyStopTimePicked = (stime) => {
    const newObject = Object.assign({}, this.state.device);
    if (this.state.timerMode === 'timer') {
      const newTimerObject = Object.assign(this.state.device.timer, {stop: moment(stime).format('X')});
      newObject.timer = newTimerObject;
      this.setState({device: newObject}, console.log("timer :", this.state.device.timer)); 
    }
    else {
      const newTimerObject = Object.assign(this.state.device.schedule, {stop: moment(stime).format('X')});
      newObject.schedule = newTimerObject;
      this.setState({device: newObject}, console.log("schedule :", this.state.device.schedule));
    }
    this._hideStopDailyTimePicker();
  };


  _onSignOutPressed = () => {
		Auth.signOut()
    .then((data) => {
      console.log(data);
      this.props.navigation.navigate('Home', {});
    }) 
    .catch(err => console.log(err));
  }
  
  _onSetTimerPress = () => {
    this.setState({timerMode: 'timer'}, this.setVisibleTimerModal(true));
  }

  _onSetSchedulePress = () => {
    this.setState({timerMode: 'schedule'}, this.setVisibleTimerModal(true));
  }

  //  An instance of the device Shadow
  myDeviceShadow;
  myDeviceLocation;
  myDeviceWeather;
  myScheduler;

  //  Configure device Shadow
  configureIotDevice() {
    const thingShadows = awsIot.thingShadow({
          region: iotLogin.region,
          host: iotLogin.host,
          filename: iotLogin.filename,
          profile: iotLogin.profile,
          protocol: iotLogin.protocol,
          accessKeyId: iotLogin.accessKeyId,
          secretKey: iotLogin.secretKey,
          // sessionToken: 'test', /* not needed */
      });

    const deviceId = this.props.navigation.state.params.device_id;
    const device = this.state.device;
    const that = this;

      thingShadows.on('connect', function () {
           console.log('connected to AWS IoT');
           console.log('Registering device shadow: ', deviceId);
           thingShadows.register(deviceId, {ignoreDeltas: false},
              function(err, failedTopics) {
                 if (isUndefined(err) && isUndefined(failedTopics)) {
                    console.log('Device thing registered.');
                    that.setState({isConnectedToThingShadow: true});
                    thingShadows.get(deviceId);   // Get current shadow state
                 }
                 else {
                   console.log('Device ' + deviceId + ' not registered.');
                   // console.log('error: ', error);
                   // console.log('failedTopics: ', failedTopics);
                 }
              });
        });

      thingShadows.on('status',
          function(thingName, stat, clientToken, stateObject) {
             console.log('received '+stat+' on '+thingName+': '+
                         JSON.stringify(stateObject));
             if (stateObject.state.reported) {
               // console.log('stateObject: ', stateObject);
               var reportedState = Object.assign(device, stateObject.state.reported)
               that.setState ({ device: reportedState  });
             }
          });

      thingShadows.on('delta',
          function(thingName, stateObject) {
             console.log('received delta on '+thingName+': '+
                         JSON.stringify(stateObject));
          });

      thingShadows.on('timeout',
          function(thingName, clientToken) {
             console.log('received timeout on '+thingName+
                         ' with token: '+ clientToken);
          });

      thingShadows.on('close', function(thingName) {
          thingShadows.unregister(thingName);
          that.setState({isConnectedToThingShadow: false});
          });

      thingShadows.on('message',
          function(topic, message) {
             console.log('topic is '+topic+
                         ' message: '+ message);
          });

      thingShadows.on('error', error => {
             console.log(error);
          });

    return thingShadows;
  }


  handleShadowUpdate(desiredObject) {
    // function to handle changes in shadow State
    // if (this.state.setTime) {
    //   var poolTimerState = {"state":{"desired":{
    //     relay: Number(this.state.pumpButton),
    //     timer: this.state.device.timer,
    //     schedule: this.state.device.schedule,
    //   }}};
    // }
    // else {
    //   var poolTimerState = {"state":{"desired":{relay: Number(this.state.pumpButton)}}};
    // }
    var poolTimerState = {"state":{"desired": desiredObject}};

    console.log("updating " + this.state.deviceId + ": " + JSON.stringify(poolTimerState.state.desired));
    var clientTokenUpdate = this.myDeviceShadow.update(this.state.deviceId, poolTimerState);
    if (clientTokenUpdate === null)
    {
       console.log('update shadow failed, operation still in progress');
    }
  }


  _renderTimerView = (title, timerObject) => (
    <View style={styles.borderContainer}>
      <Text style={styles.BorderText}> {title} </Text>
        <View style={styles.dataContainer}>
          <View style={styles.dataItemContainer}>
            <TouchableOpacity onPress={this._showStartDailyTimePicker}>
              <Text style={styles.DataTitleText}> START TIME </Text>
            </TouchableOpacity>
  
            <TouchableOpacity onPress={this._showStartDailyTimePicker}>
              <Text style={styles.DataItemText}> {moment.unix(timerObject.start).format('LTS')}</Text>
            </TouchableOpacity>
            <DateTimePicker
              isVisible={this.state.isStartDailyTimePickerVisible}
              onConfirm={this._handleDailyStartTimePicked}
              onCancel={this._hideStartDailyTimePicker}
              mode="time"
              is24Hour={false}
            />
          </View>
  
          <View style={styles.dataItemContainer}>
            <TouchableOpacity onPress={this._showStopDailyTimePicker}>
              <Text style={styles.DataTitleText}> STOP TIME </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this._showStopDailyTimePicker}>
              <Text style={styles.DataItemText}> {moment.unix(timerObject.stop).format('LTS')}</Text>
            </TouchableOpacity>
            <DateTimePicker
              isVisible={this.state.isStopDailyTimePickerVisible}
              onConfirm={this._handleDailyStopTimePicked}
              onCancel={this._hideStopDailyTimePicker}
              mode="time"
              is24Hour={false}
            />
          </View>
        </View>
  
        <View style={styles.modalFooterContainer}>
          <View style={styles.modalButtonContainer}>
            <Button
              onPress={this._handleSetSchedule}
              raised={true}
              icon={'hourglass-full'}
              text={'SET TIME'}
              style={{text: styles.timerButtonStyle,
                      container: styles.modalButtonContainer}}
            />
          </View>

          <View style={styles.modalButtonContainer}>
            <Button
              onPress={this._closeModal}
              raised={true}
              text={'CLOSE'}
              style={{text: styles.timerButtonStyle,
                      container: styles.modalButtonContainer}}
              />
          </View>
        </View>
      </View>
  );

  render() {
    const { params } = this.props.navigation.state;
    const { device } = this.state;
    const connectText = this.state.isConnectedToThingShadow ? "Connected" : "NOT Connected";
    const nowDate = this.state.time;

    const iconRelayLook = device.relay ?  <Image source={require('./images/power.png')}/> :
                                          <Image source={require('./images/power_off.png')}/>;

    const modeLookAndFeel = device.auto ? <Image source={require('./images/auto_48.png')}/> :
                                          <Image source={require('./images/manual_48.png')}/>;

    const cityState = this.myDeviceLocation && (this.myDeviceLocation.status == "success") ?
                      this.myDeviceLocation.city + ', ' + this.myDeviceLocation.region : '';


    const modalRenderFunc = this.state.timerMode === 'timer' ? this._renderTimerView("Set Timer", this.state.device.timer) :
                                                                this._renderTimerView("Set Daily Schedule", this.state.device.schedule);
    let weatherIcon = <View />;
    let weatherDescription = '';
    if (this.myDeviceWeather) {
      const weatherIconSource = `http://openweathermap.org/img/w/${this.myDeviceWeather.weather[0].icon}.png`;
       weatherIcon = <Image source={{uri: weatherIconSource}} style={{width: 50, height: 50}}/>;
       weatherDescription = this.myDeviceWeather.weather[0].description;
      //  console.log("weather icon source", weatherIconSource );
    }

    return (
      <ThemeProvider uiTheme={darkBaseTheme}>
        <View style={styles.container}>
          <View style={styles.pickerContainer}>
            <FaIconToggle.Button name='sign-out'
                style={styles.actionButtonContainer}
                onPress={this._onSignOutPressed}>
            </FaIconToggle.Button>

            <Text style={styles.NormalText}> <Text style={styles.pickerText}>{params.device_id}</Text> : {connectText} </Text>
          </View>

          <View style={styles.locationContainer}>
            <Text style={styles.NormalText}>
              {nowDate}
            </Text>
            {weatherIcon}
            <Text style={styles.NormalText}>
            {`${this.capitalizeFirstLetter(weatherDescription)}`}
            </Text>
            <Text style={styles.NormalText}>
              {cityState}
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <Text style={styles.NormalText}>
              {device.temp}°C Ambient
            </Text>
            <Icon name='pool' style={styles.PoolIconStyle}/>
            <Text style={styles.NormalText}>
              {device.press} PSI Ambient
            </Text>
          </View>

          <View style={styles.dataContainer}>
            <View style={styles.dataItemContainer}>
              <Text style={styles.DataTitleText}>VOLTAGE</Text>
              <Text style={styles.DataItemText}>{device.volt} Vac</Text>
            </View>
            <View style={styles.dataItemContainer}>
              <Text style={styles.DataTitleText}>CURRENT</Text>
              <Text style={styles.DataItemText}>{device.cur} A</Text>
            </View>
            <View style={styles.dataItemContainer}>
              <Text style={styles.DataTitleText}>POWER</Text>
              <Text style={styles.DataItemText}>{device.pow} kW</Text>
            </View>
        </View>

        <View style={styles.dataContainer}>
          <View style={styles.dataItemContainer}>
            <Text style={styles.DataTitleText}>PUMP SWITCH</Text>
            <FaIconToggle name = {this.state.pumpButton ? "toggle-on" : "toggle-off"}
              style={this.state.pumpButton ? styles.OffButtonIconStyle : styles.OnButtonIconStyle}
              onPress={this.onPumpButtonPressed}/>
          </View>
          <View style={styles.dataItemContainer}>
            <Text style={styles.DataTitleText}>RELAY STATUS</Text>
            {iconRelayLook}
          </View>
          <View style={styles.dataItemContainer}>
            <Text style={styles.DataTitleText}>MODE</Text>
            {modeLookAndFeel}
          </View>
        </View>

        <View style={styles.timerContainer}>
          <View style={styles.dataItemContainer}>
            <Text 
              style={styles.NormalText}
              onPress={this._onSetTimerPress}>
              SET TIMER
            </Text>
          </View>
          <View style={styles.dataItemContainer}>
            <Text style={styles.NormalText}
              onPress={this._onSetSchedulePress}>
              SET SCHEDULE
            </Text>
          </View>
        </View>

        <Modal
          isVisible={this.state.isVisibleTimerModal}
          animationIn={'slideInLeft'}
          animationOut={'slideOutRight'}
          transparent={true}
          presentationStyle={'overFullScreen'}
        >
          {modalRenderFunc}
        </Modal>

        </View>
        </ThemeProvider>
    );
  }
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxHeight: 35,
    backgroundColor: 'black',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    backgroundColor: Color(COLOR.grey600).string(),
    justifyContent: 'center',
    alignItems: 'stretch',           /* secondary axis */
  },
  locationContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  iconContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  dataContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  dataItemContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
//    backgroundColor: 'black',
  },
  borderContainer: {
    flex: 1,
    backgroundColor: 'black',
    maxHeight: 200,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  modalFooterContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center', /* primary axis */
    alignItems: 'flex-end',
    backgroundColor: 'black',
    maxHeight: 40,
  },
  modalButtonContainer: {
    flex: 1,
    backgroundColor: Color(COLOR.grey700),
  },
  NormalText: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'normal',
    textAlign: 'center',
    color: 'white',
  },
  WeatherText: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'normal',
    textAlign: 'center',
    color: Color(COLOR.grey500).string(),
  },  
  DataItemText: {
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
  },
  DataTitleText: {
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: 'bold',
    textAlign: 'center',
    color: Color(COLOR.grey700),
  },
  BorderText: {
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
  },
  PoolIconStyle: {
    fontSize : 48,
    color : "white"
  },
  OnButtonIconStyle: {
    fontSize : 48,
    color : "black"
  },
  OffButtonIconStyle: {
    fontSize : 48,
    color : "black"
  },
  DataIconStyle: {
    fontSize : 48,
    color : "black"
  },
  timerButtonStyle: {
    fontSize : 16,
    color : "white"
  },
  pickerText: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'green',
//    textDecorationLine: 'underline',
  },
});
