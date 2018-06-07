require('node-libs-react-native/globals');

import React, { Component } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  View,
  ActivityIndicator,
  Image,
  Dimensions,
  YellowBox,
} from 'react-native';

//import AwesomeAlert from 'react-native-awesome-alerts';
import { COLOR, ThemeProvider, Button } from 'react-native-material-ui';
import darkBaseTheme from './darkBaseTheme';
import Icon from 'react-native-vector-icons/FontAwesome';
import Amplify from 'aws-amplify';
import { Auth } from 'aws-amplify';

YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader']);

const { cognitoLogin } = require("./aws/cred.json");

var Color = require('color');

const ScaleImage = ({source, originalWidth, originalHeight}) => {
  let imageWidth = Dimensions.get('window').width;
  let imageHeight = Dimensions.get('window').height;
  let widthChange = (imageWidth)/originalWidth;
  let newWidth = originalWidth * widthChange;
  let newHeight = originalHeight * widthChange;
  return  (
    <Image source={source} style={{width: newWidth, height: newHeight}}/>
  )
};

export default class SmartPoolLogin extends Component<{}> {
	static navigationOptions = {
    title: 'Smart Pool Timer App',
    headerTitleStyle: { alignSelf: 'center' },
    headerLeft: (<View></View>),
    headerRight: (<View></View>),
    headerTitleStyle: { color: 'white', textAlign: 'center', alignSelf: 'center' },
    headerStyle: { backgroundColor: 'black'},
  };

	constructor(props) {
		super(props);

		this.state= {
			email: '',
			password: '',
			device_id: '',
			isLoggedIn: false,
			message: '',
			isLoginMode: true,
			altModeText: 'Register ?',
      showAlert: 'false',
		};
	}

 componentDidMount () {
   Auth.currentSession()
   .then((user) => {
     // here redirect to smartpoolApp
     console.log("currentAuthenticatedUser", user);
     const id = user.idToken.payload["custom:device_id"];
     this.props.navigation.navigate('SmartPoolApp', {
         device_id: id,
         isLoggedIn: true,
         currentUser: user});
   })
   .catch(err => console.log(err));

   // Auth.currentUserInfo()
   // .then((me) => {
   //   const id = me.attributes["custom:device_id"];
   //   console.log("currentuserinfo ", me);
   //   console.log('SmartPoolApp device_id: ', id);
   // })
   // .catch(err => console.log(err));
 }

 authConfig = Amplify.configure({
       Auth: {
    // REQUIRED - Amazon Cognito Identity Pool ID
        identityPoolId: cognitoLogin.identityPoolId,
    // REQUIRED - Amazon Cognito Region
        region: cognitoLogin.region,
    // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: cognitoLogin.userPoolId,
    // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
        userPoolWebClientId: cognitoLogin.userPoolWebClientId,
    },
    API: {
        endpoints: [
            {
                name: "MyAPIGatewayAPI",
                endpoint: "https://c2j5ssl9yj.execute-api.us-east-1.amazonaws.com/api/login"
            }
        ]
      }
 });


  _onSubmitPressed = () => {
		if (this.state.isLoginMode) {
			return this._handleLogin();
		} else {
			return this._handleRegister();
		}
	}

	_onRegisterPress = () => {
		 if (this.state.isLoginMode) {
			 this.setState({
				 altModeText: 'Login?',
				 isLoginMode: !this.state.isLoginMode,
		   });
		 } else {
			 this.setState({
				 altModeText: 'Register?',
				 isLoginMode: !this.state.isLoginMode,
		   });
		 }
	}

  _handleText = (key, text) => {
    if(text == '') {
      text = null;
    }
    this.setState({key: text});
  }

	_handleResponseLogin(response) {
    console.log('_handleResponseLogin user: ', response);

			this.setState({
				 isLoggedIn: false,
         email: '',
         password: '',
				 device_id: '',
         message: '',
			});

      Auth.currentUserInfo()
      .then((me) => {
        const id = me.attributes["custom:device_id"];
        console.log("currentuserinfo ", me);
        console.log('SmartPoolApp device_id: ', id);
        // here redirect to smartpoolApp
        this.props.navigation.navigate('SmartPoolApp', {
            device_id: id,
            isLoggedIn: true,
            currentUser: response});
      })
      .catch(err => console.log(err));

	}

	_handleResponseRegister(response) {
		console.log('new User: ', response);
    this.setState({
       isLoggedIn: false,
       email: '',
       password: '',
       device_id: '',
       message: '',
    });
    this._onRegisterPress();
		this.props.navigation.navigate('SmartPoolLogin', {});
	}

	_handleLogin() {
		const { state } = this.state;
    const username = this.state.email;
    const password = this.state.password;

    Auth.signIn(username, password)
    .then((user) => {
      this.setState({
         isLoggedIn: true,
      })
      this._handleResponseLogin (user);
    })
    .catch(err => Alert.alert("Error: " + err.message));
    // err is an object with keys "code", "name" and "message"
  };

	_handleRegister() {
		const { state } = this.state;
    const username = this.state.email;
    const password = this.state.password;
    const device_id = this.state.device_id;

    // TODO: need to check if device_id is valid
    // if it is valid, then go ahead and signup user

    Auth.signUp({
        'username': username,
        'password': password,
        'attributes': {
            'custom:device_id': device_id,          // optional
        },
        validationData: []  //optional
    })
    .then((data) => {
      this._handleResponseRegister(data);
    })
    .catch(err => console.log(err));

    /* TODO Need to create ioT Thing shadow and add it to database*/

  };

  render() {
		const buttonText = this.state.isLoginMode ? 'Login' : 'Register';
    const instructionText = this.state.isLoginMode ? 'Login to SmartPoolApp' :
     'Register Pool Timer Device!';

		const showDeviceId = this.state.isLoginMode ? null :
    <View style={styles.entryContainer}>
      <Image source={require('./images/user.png')}/>
      <TextInput
      underlineColorAndroid={'transparent'}
      style={[styles.TextInputStyle, styles.InputEntryText]}
      value={this.state.device_id}
      onChange={(event) => this.setState({device_id: event.nativeEvent.text})}
      placeholderTextColor={'white'}
      placeholder='enter device_id'/>
    </View>;

    return (
      <ThemeProvider uiTheme={darkBaseTheme}>
      <View style={styles.container}>
           <View style={styles.imageContainer}>
             <ScaleImage
             source={require('./images/bg_pool.png')}
             originalWidth={1600}
             originalHeight={900}
             />
           </View>

          <View style={styles.inputEntryContainer}>
            <View style={styles.entryContainer}>
              <Image source={require('./images/email.png')}/>
              <TextInput
              underlineColorAndroid={'transparent'}
              style={[styles.TextInputStyle, styles.InputEntryText]}
              value={this.state.email ? this.state.email : ''}
              onChange={(event) => this.setState({email: event.nativeEvent.text})}
              keyboardType={'email-address'}
              placeholderTextColor={'white'}
              placeholder='enter email'/>
            </View>

            <View style={styles.entryContainer}>
              <Image source={require('./images/password.png')}/>
              <TextInput
              underlineColorAndroid={'transparent'}
              style={[styles.TextInputStyle, styles.InputEntryText]}
    					value={this.state.password}
    					onChange={(event) => this.setState({password: event.nativeEvent.text})}
              secureTextEntry={true}
              placeholderTextColor={'white'}
              placeholder='enter password'/>
            </View>

            {showDeviceId}
          </View>

            <View style={styles.actionTextContainer}>
              <Icon.Button name='sign-in'
                style={styles.actionButtonContainer}
                onPress={this._onSubmitPressed}>
                <Text style={styles.actionTextStyle}>
                  {buttonText}
                </Text>
              </Icon.Button>
            </View>

          <View style={styles.footerContainer}>
            <Text
              style={styles.footerText}
              onPress={this._onRegisterPress}>
              {this.state.altModeText}
            </Text>
         </View>

         </View>
        </ThemeProvider>
    );
	}
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
//    justifyContent: 'space-evenly',
//    backgroundColor: 'blue',
  },
  container: {
   flex: 1,
   backgroundColor: 'black',
   justifyContent: 'space-between',
  },
  imageContainer: {
    flex: 3,
    borderRadius: 5,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  inputEntryContainer: {
    flex: 2,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  InputEntryText: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'normal',
    textAlign: 'center',
    color: 'white',
  },
  entryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 5,
    borderColor: Color(COLOR.grey100),
    minWidth: 300,
    maxHeight: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  TextInputStyle: {
		height: 35,
		padding: 8,
		marginTop: 2,
    marginBottom: 2,
    minWidth: 200,
		fontSize: 14,
		borderWidth: 2,
    borderColor: 'transparent',
		borderRadius: 5,
	},
  actionTextContainer: {
    flex: 1,
    justifyContent: 'center', /* primary axis */
  },
  actionButtonContainer: {
    backgroundColor: Color(COLOR.grey900).string(),
    minHeight: 35,
    justifyContent: 'center',
    alignItems: 'center',           /* secondary axis */
  },
  footerContainer: {
    flex: 1,
    margin: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',           /* secondary axis */
  },
  actionTextStyle: {
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
  },
  footerText: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: 'normal',
    textAlign: 'center',
    color: 'green',
    textDecorationLine: 'underline',
  },
  alertContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  alertButton: {
    margin: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: "#AEDEF4",
  },
  alertText: {
    color: '#fff',
    fontSize: 15
  },
});
