import React, { useEffect, useState } from 'react';
import { Alert, Button } from 'reactstrap';

const ShowAlert = ({ alertMsg, color, setShowAlert, durationMs, closeLabel }) => {
  const [visible, setVisible] = useState(false);
  //const [alertMsg, setAlertMsg] = useState('');

  useEffect(() => {
    showAlert();
  }, [alertMsg]);

  const showAlert = () => {
    //setAlertMsg(msg);
    setVisible(true);
    // Se oculta después de 5 segundos (opcional)
    setTimeout(() => {
      setVisible(false);
      setShowAlert(false);
    }, durationMs);
  };

  return (
    <div>
      {visible && (
        <Alert closeAriaLabel={closeLabel} color={color} toggle={() => setVisible(false)}>
          {alertMsg}
        </Alert>
      )}
    </div>
  );
};

export default ShowAlert;
