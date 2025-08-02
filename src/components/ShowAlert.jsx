import React, { useEffect, useState } from 'react';
import { Alert, Button } from 'reactstrap';

const ShowAlert = ({ alertMsg, color, setShowAlert }) => {
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
    }, 5000);
  };

  return (
    <div>
      {visible && (
        <Alert color={color} toggle={() => setVisible(false)}>
          {alertMsg}
        </Alert>
      )}
    </div>
  );
};

export default ShowAlert;
