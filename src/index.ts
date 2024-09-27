import { kalypso } from './kalypso';
import { app } from './server';

// approve a large number before starting the service so that further requests are faster
kalypso
  .MarketPlace()
  .approvePaymentTokenToMarketPlace('100000000000000000000')
  .then((tx) => () => {
    return tx.wait(10);
  })
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`kalypso-server delegated server running on port : ${process.env.PORT}`);
    });
  })
  .catch(() => {
    console.error('Failed to start the server');
  });
