import React from 'react';
import DemoPage from './DemoPage';

export default {
  title: 'Pages/DemoPage',
  component: DemoPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => <DemoPage />;
