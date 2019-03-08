import React, { useRef, useEffect } from 'react';
import useComponentSize from '@rehooks/component-size'

import CanvasContext from './Context';
import { addToTree, removeFromTree, getChild, buildLayoutTree } from './tree-utils';

import layoutWorker from './layout.worker';
import drawWorker from './draw.worker';

const { Provider } = CanvasContext;

export default function CanvasRoot(props) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const treeRef = useRef({ children: {}, props: null });
  const layoutTreeRef = useRef({ children: {}, props: null });
  const bufferRef = useRef([]);
  const layoutWorkerRef = useRef(null);
  const drawWorkerRef = useRef(null);
  const sizeRef = useRef(null);
  let size = useComponentSize(containerRef)

  const redraw = (parent, id, props) => {
    let arr = bufferRef.current;
    let child = getChild({ layoutTree: layoutTreeRef.current, parent, id, props });
    if (child) {
      arr.push({ parent, id, child });
      bufferRef.current = arr;
    }
  };

  const handleBuffer = () => {
    let { width, height } = sizeRef.current;
    if (bufferRef.current.length > 0) {
      layoutWorkerRef.current.postMessage({ operation: 'updateLayout', args: { buffer: bufferRef.current, width, height } })
      bufferRef.current = [];
    }
    requestAnimationFrame(handleBuffer);
  }

  const registerNode = (parent, id, props, getProps, type) => {
    const tree = treeRef.current;
    addToTree({ tree, parent, id, props, getProps, type });
  };

  const unregisterNode = (parent, id) => {
    let targetPath = treeRef.current;
    removeFromTree({ targetPath, parent, id });
  };

  const handleMessage = (event) => {
    layoutTreeRef.current = event.data;
    drawWorkerRef.current.postMessage({ operation: 'updateTree', args: { tree: layoutTreeRef.current } });
  };

  useEffect(() => {
    const { width, height } = size;

    layoutTreeRef.current = buildLayoutTree({ tree: treeRef.current });
    layoutWorkerRef.current = new layoutWorker();

    const tree = layoutTreeRef.current;
    layoutWorkerRef.current.addEventListener('message', handleMessage);
    layoutWorkerRef.current.postMessage({ operation: 'initializeLayout', args: { tree, width: width, height: height } });

    const offscreen = canvasRef.current.transferControlToOffscreen();

    drawWorkerRef.current = new drawWorker();
    drawWorkerRef.current.postMessage({ operation: 'init', canvas: offscreen }, [offscreen]);

    requestAnimationFrame(handleBuffer);
  }, []);

  useEffect(() => {
    const { width, height } = size;
    drawWorkerRef.current.postMessage({ operation: 'resizeCanvas', args: { width, height } });
    layoutWorkerRef.current.postMessage({ operation: 'recalcLayout', args: { width: width, height: height } });
    sizeRef.current = size;
  }, [size]);

  return (
    <Provider
      value={{
        parent: 'CanvasRoot',
        registerNode: registerNode,
        redraw: redraw,
        unregisterNode: unregisterNode,
      }}
    >
      <div ref={containerRef} {...props}>
        <canvas ref={canvasRef} height={600} width={600} style={{ display: 'block' }}>
          {props.children || null}
        </canvas>
      </div>
    </Provider>
  );
}
