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
  if (!boxes || boxes.length === 0) {
    return null;
  }

  const scaleX = previewWidth / imageWidth;
  const scaleY = previewHeight / imageHeight;

  return (
    <>
      {boxes.map((box, index) => {
        if (!box || box.width <= 0 || box.height <= 0) {
          return null;
        }
        
        return (
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
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF00',
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 4,
    fontSize: 12,
    position: 'absolute',
    top: 0,
  },
});