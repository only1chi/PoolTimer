/**
 * React Native App
 * Chiz Chikwendu
 * @flow
 */
'use strict';

import React, { Component } from 'react';

import {
  createStackNavigator,
} from 'react-navigation';

import SmartPoolLogin from './SmartPoolLogin';
import SmartPoolApp from './SmartPoolApp';

type Props = {};

const App = createStackNavigator({
  Home: { screen: SmartPoolLogin },
  SmartPoolApp: { screen: SmartPoolApp },
});

export default App;
