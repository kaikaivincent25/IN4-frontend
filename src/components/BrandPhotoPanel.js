import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

const BrandPhotoPanel = ({ source, children, style, imageStyle, overlayStyle }) => (
  <ImageBackground
    source={{ uri: source }}
    style={[styles.panel, style]}
    imageStyle={[styles.image, imageStyle]}
    resizeMode="cover"
  >
    <View style={[styles.overlay, overlayStyle]}>{children}</View>
  </ImageBackground>
);

const styles = StyleSheet.create({
  panel: { overflow: 'hidden', borderRadius: 24 },
  image: { borderRadius: 24 },
  overlay: { flex: 1, backgroundColor: 'rgba(7, 21, 46, 0.72)', padding: 20 },
});

export default BrandPhotoPanel;
