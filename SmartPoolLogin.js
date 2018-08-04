require('node-libs-react-native/globals');

import React, { Component } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Dimensions,
  YellowBox,
} from 'react-native';

import { COLOR, ThemeProvider, Button } from 'react-native-material-ui';
import darkBaseTheme from './darkBaseTheme';
import Icon from 'react-native-vector-icons/FontAwesome';
import Amplify from 'aws-amplify';
import { Auth } from 'aws-amplify';
import Modal from 'react-native-modal';

// Warnings I can't do anything about
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader']);
YellowBox.ignoreWarnings(['Setting a timer']);
YellowBox.ignoreWarnings(['Remote debugger is in a background tab']);

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
      code: '',
			device_id: '',
			isLoggedIn: false,
			message: '',
      isVisibleConfirmModal: false,
      isVisibleForgotPasswordModal: false,
      isVisibleResetPasswordModal: false,
      pageMode: "login",
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
 }

 componentWillMount() {
  this.setState({
    isVisibleConfirmModal: false,
    isVisibleForgotPasswordModal: false,
    isVisibleResetPasswordModal: false,
  });
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
    if (this.state.pageMode === 'register') {
			return this._handleRegister();
    }
    else {
      return this._handleLogin();
    }
	}

	_onRegisterPress = () => {
    if (this.state.pageMode === 'register') {
			 this.setState({
				 altModeText: 'Register ?',
				 pageMode: 'login',
		   });
     } else {
      this.setState({
        altModeText: 'Login ?',
        pageMode: 'register',
      });
    }
	}

  _onForgotPasswordPress = () => {
    this.setState({
      isLoggedIn: false,
      email: '',
      password: '',
      device_id: '',
      message: '',
      isVisibleForgotPasswordModal: true
   });

  }

  _closeModalForgotPassword = () => {
    this.setState({
      isVisibleForgotPasswordModal: false
    });  
  }
  
  _closeModalResetPassword = () => {
    this.setState({
      isVisibleResetPasswordModal: false
    });  
  }

  _handleText = (key, text) => {
    if(text == '') {
      text = null;
    }
    this.setState({key: text});
  }

	_handleResponseLogin(response) {
    console.log('_handleResponseLogin user: ', response);

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
      .catch((err) => {
        Alert.alert("Error: " + err.message);
        console.log(err);
      })

			this.setState({
        isLoggedIn: false,
        email: '',
        password: '',
        device_id: '',
        message: '',
     });
	}

	_handleResponseRegister(response) {
		// console.log('new User: ', response);
    this.setState({
       isLoggedIn: false,
       email: '',
       password: '',
       device_id: '',
       message: '',
       pageMode: 'login',
       altModeText: 'Login?'
    });
    // this._onRegisterPress();
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
    .catch((err) => {
      Alert.alert("Error: " + err.message);
      console.log(err);
    })
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
      console.log("SignUp Response: ", data);
      this.setState({isVisibleConfirmModal: true});
    })
    .catch((err) => {
      Alert.alert("Error: " + err.message);
      console.log(err);
    })

    /* TODO Need to enter confirmation code */
  };

  _handleConfirmation = () => {
    const username = this.state.email;
    const code = this.state.code;

    this.setState({isVisibleConfirmModal: false});

    if (username && code) {
      Auth.confirmSignUp(username, code)
      .then((data) => {
        // console.log("SignUp Confirm: ", data);
        this._handleResponseRegister(data);
      })
      .catch((err) => {
        Alert.alert("Error: " + err.message);
        console.log(err);
      })
    }
  } 

  _handleForgotPassword = () => {
    const username = this.state.email;

    this.setState({isVisibleForgotPasswordModal: false});
    
    Auth.forgotPassword(username)
    .then((data) => {
      console.log(data);
      this.setState({
        isVisibleResetPasswordModal: true
      });
    })
    .catch((err) => {
      Alert.alert("Error: " + err.message);
      console.log(err);
    })
  }


  _handleSubmitPassword = () => {
    const username = this.state.email;
    const code = this.state.code;
    const password = this.state.password;

    this.setState({isVisibleResetPasswordModal: false});

    Auth.forgotPasswordSubmit(username, code, password)
    .then((data) => {
      console.log(data);
      this.setState({pageMode: "login"});
    })
    .catch((err) => {
      Alert.alert("Error: " + err.message);
      console.log(err);
    })
  }

  _renderSignUpconfirm = () => (
    <View style={styles.borderContainer}>
      <View style={styles.inputEntryContainer}>
        <View style={styles.entryContainer}>
          <TextInput
          underlineColorAndroid={'transparent'}
          style={[styles.TextInputStyle, styles.InputEntryText]}
          value={this.state.code ? this.state.code : ''}
          onChange={(event) => this.setState({code: event.nativeEvent.text})}
          placeholderTextColor={'white'}
          placeholder='enter confirmation code'/>
        </View>
      </View>

      <View style={styles.modalFooterContainer}>
        <View style={styles.modalButtonContainer}>
          <Button
            onPress={this._handleConfirmation}
            raised={true}
            text={'OK'}
            style={{text: styles.InputEntryText,
                    container: styles.modalButtonContainer}}
          />
        </View>
      </View>
    </View>
  );

  _renderForgotPassword = () => (
    <View style={styles.borderContainer}>
      <Text style={styles.BorderText}> Forgot Password </Text>
      <View style={styles.inputEntryContainer}>
        <View style={styles.entryContainer}>
          <TextInput
          underlineColorAndroid={'transparent'}
          style={[styles.TextInputStyle, styles.InputEntryText]}
          value={this.state.email ? this.state.email : ''}
          onChange={(event) => this.setState({email: event.nativeEvent.text})}
          placeholderTextColor={'white'}
          placeholder='enter email'/>
        </View>
      </View>

      <View style={styles.modalFooterContainer}>
        <View style={styles.modalButtonContainer}>
          <Button
            onPress={this._handleForgotPassword}
            raised={true}
            text={'OK'}
            style={{text: styles.InputEntryText,
                    container: styles.modalButtonContainer}}
          />
        </View>    
        <View style={styles.modalButtonContainer}>
          <Button
            onPress={this._closeModalForgotPassword}
            raised={true}
            text={'CLOSE'}
            style={{text: styles.InputEntryText,
                    container: styles.modalButtonContainer}}
          />
        </View>
      </View>
    </View>
  );

  _renderResetPassword = () => (
    <View style={styles.borderContainer}>
      <Text style={styles.BorderText}> Reset Password </Text>
      <View style={styles.inputEntryContainer}>
        <View style={styles.entryContainer}>
          <TextInput
          underlineColorAndroid={'transparent'}
          style={[styles.TextInputStyle, styles.InputEntryText]}
          value={this.state.code ? this.state.code : ''}
          onChange={(event) => this.setState({code: event.nativeEvent.text})}
          placeholderTextColor={'white'}
          placeholder='enter confirmation code'/>
        </View>
        
        <View style={styles.entryContainer}>
          <TextInput
          underlineColorAndroid={'transparent'}
          style={[styles.TextInputStyle, styles.InputEntryText]}
          value={this.state.password ? this.state.password : ''}
          onChange={(event) => this.setState({password: event.nativeEvent.text})}
          placeholderTextColor={'white'}
          placeholder='enter new password'/>
        </View>
      </View>

      <View style={styles.modalFooterContainer}>
        <View style={styles.modalButtonContainer}>
          <Button
            onPress={this._handleSubmitPassword}
            raised={true}
            text={'RESET'}
            style={{text: styles.InputEntryText,
                    container: styles.modalButtonContainer}}
          />
        </View>
        <View style={styles.modalButtonContainer}>
          <Button
            onPress={this._closeModalResetPassword}
            raised={true}
            text={'CLOSE'}
            style={{text: styles.InputEntryText,
                    container: styles.modalButtonContainer}}
          />
        </View>
      </View>
    </View>
  );

  render() {
    const buttonText = this.state.pageMode === 'register' ? 'REGISTER' : 'LOGIN';

		const showDeviceId = this.state.pageMode === 'register' ?
    <View style={styles.entryContainer}>
      <Image source={require('./images/user.png')}/>
      <TextInput
      underlineColorAndroid={'transparent'}
      style={[styles.TextInputStyle, styles.InputEntryText]}
      value={this.state.device_id}
      onChange={(event) => this.setState({device_id: event.nativeEvent.text})}
      placeholderTextColor={'white'}
      placeholder='enter device_id'/>
    </View>
    : null;

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

          <Modal
            isVisible={this.state.isVisibleConfirmModal}
            animationIn={'slideInLeft'}
            animationOut={'slideOutRight'}
            transparent={true}
            presentationStyle={'overFullScreen'}
          >
            {this._renderSignUpconfirm()}
          </Modal>

          <Modal
            isVisible={this.state.isVisibleForgotPasswordModal}
            animationIn={'slideInLeft'}
            animationOut={'slideOutRight'}
            transparent={true}
            presentationStyle={'overFullScreen'}
          >
            {this._renderForgotPassword()}
          </Modal>

          <Modal
            isVisible={this.state.isVisibleResetPasswordModal}
            animationIn={'slideInLeft'}
            animationOut={'slideOutRight'}
            transparent={true}
            presentationStyle={'overFullScreen'}
          >
            {this._renderResetPassword()}
          </Modal>


          <View style={styles.footerContainer}>
            <Text
              style={styles.footerText}
              onPress={(this._onRegisterPress)}>
              {this.state.altModeText}
            </Text>
            <Text
              style={styles.footerText}
              onPress={this._onForgotPasswordPress}>
              Forgot Password ?
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
  borderContainer: {
    flex: 1,
    backgroundColor: 'black',
    maxHeight: 200,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  BorderText: {
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
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
  }
});
