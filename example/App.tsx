import React from 'react';
import { CaptionWithIntention } from '../src/lib';
import type { TimingSyncData } from '../src/lib';

// Example component showing how to use the library
function ExampleApp() {
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <h1 style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
        Caption With Intention Library Example
      </h1>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <CaptionWithIntention
          videoSrc="/test-output/sample_video.mp4"
          timingSyncSrc="/test-output/enhanced_timing_sync.json"
          responsive={true}
        />
      </div>
      
      <div style={{ color: 'white', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2>Usage Instructions:</h2>
        <ol>
          <li>Install the library: <code>npm install caption-with-intention</code></li>
          <li>Import the component and styles</li>
          <li>Provide video source and timing sync data</li>
          <li>Configure responsive or fixed dimensions</li>
        </ol>
        
        <h3>Example Code:</h3>
        <pre style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
{`import { CaptionWithIntention } from 'caption-with-intention';
import 'caption-with-intention/styles';

function App() {
  return (
    <CaptionWithIntention
      videoSrc="/path/to/video.mp4"
      timingSyncSrc="/path/to/timing_sync.json"
      responsive={true}
    />
  );
}`}
        </pre>
      </div>
    </div>
  );
}

export default ExampleApp;