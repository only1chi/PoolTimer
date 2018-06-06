import React, { Component } from 'react';
import { Navigator, NativeModules } from 'react-native';

import { COLOR, ThemeProvider } from 'react-native-material-ui';


var Color = require('color');

export const darkBaseTheme = {
  fontFamily: 'Roboto, sans-serif',
  borderRadius: 2,
  palette: {
    // main theme colors
    //  primaryColor: cyan700,
    // accentColor: pinkA200,
    // primaryColor: cyan700,
    // accentColor: pinkA400,
    primaryColor: Color(COLOR.grey600),
    accentColor: Color(COLOR.pinkA100),
    // text color palette
    textColor: Color(COLOR.white),
    primaryTextColor: Color(COLOR.white).alpha(1),
    secondaryTextColor: Color(COLOR.white).alpha(0.7).string(),
    alternateTextColor: Color('#303030'),
    // backgrounds and borders
    canvasColor: Color('#303030'),
    borderColor: Color(COLOR.white).alpha(0.3).string(),

    disabledColor: Color(COLOR.white).alpha(0.3).string(),
    pickerHeaderColor: Color(COLOR.white).alpha(0.12).string(),
    clockCircleColor: Color(COLOR.white).alpha(0.12).string(),
  },
};
