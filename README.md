# PoolTimer


Android App to run custom pool timer and pump relay

Initial version of the app is designed to run on Android 6.0 and higher.

It uses aws-iot-device-sdk to connect to a thing shadow.

You must have a valid thing device thing shadow in your AWS IOT platform, and configure your IAM user profile with the right policies.

It uses accessKeyId and secretKey provided in an aws credential file. This should be located in ./aws/credentials.
