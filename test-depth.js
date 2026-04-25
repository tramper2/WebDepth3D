import { pipeline } from '@huggingface/transformers';
import fs from 'fs';

async function test() {
  const depthEstimator = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { device: 'wasm', dtype: 'q8' });
  const result = await depthEstimator('https://picsum.photos/256/256');
  console.log('depthMap dimensions:', result.depth.width, 'x', result.depth.height);
  console.log('depthMap channels:', result.depth.channels);
  console.log('predicted_depth dims:', result.predicted_depth.dims);
}
test().catch(console.error);
