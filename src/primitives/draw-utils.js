export const drawChildTree = ({ ctx, children, offset }) => {
  Object.keys(children).forEach((key, index) => {
    const child = children[key];
    drawChild({ ctx, child, offset });
  });
}

export const drawChild = ({ ctx, child, offset = { x: 0, y: 0 } }) => {
  let { left, top, width, height } = child.node.getComputedLayout();
  let offsetLeft = offset.x + left;
  let offsetTop = offset.y + top;

  const props = child.getProps();

  if (child.type === 'View') {
    ctx.fillStyle = props.style.backgroundColor || 'transparent';
    ctx.fillRect(offsetLeft, offsetTop, width, height);

    if (Object.keys(child.children).length) {
      child.offset = { x: offsetLeft, y: offsetTop };
      drawChildTree({ ctx, children: child.children, offset: child.offset });
    }
  } else {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'top';
    ctx.fillText(props.children.toString(), offsetLeft, offsetTop);
  }
}

export const redrawSubtree = ({ ctx, target, parent, id, props }) => {
  const paths = parent.split('|');

  paths.forEach((path, i, arr) => {
    if (path !== 'CanvasRoot') {
      target = target.children[path];
    }
  });
  const node = target.children[id];
  requestAnimationFrame(() => drawChild({ ctx, child: node, offset: target.offset }));
}