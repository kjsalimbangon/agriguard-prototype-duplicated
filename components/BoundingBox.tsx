import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
}

interface BoundingBoxProps {
  boxes: Box[];
  imageWidth: number;
  imageHeight: number;
  previewWidth: number;
  previewHeight: number;
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({
  boxes,
  imageWidth,
  imageHeight,
  previewWidth,
  previewHeight,
}) => {
  const scaleX = previewWidth / imageWidth;
  const scaleY = previewHeight / imageHeight;

  return (
    <>
      {boxes.map((box, index) => (
        <View
          key={index}
          style={[
            styles.box,
            {
              left: box.x * scaleX,
              top: box.y * scaleY,
              width: box.width * scaleX,
              height: box.height * scaleY,
            },
          ]}
        >
          {box.label && (
            <Text style={styles.label}>
              {box.label} {box.confidence ? `(${(box.confidence * 100).toFixed(1)}%)` : ""}
            </Text>
          )}
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF00',
    zIndex: 999,
  },
  label: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 4,
    fontSize: 12,
  },
});