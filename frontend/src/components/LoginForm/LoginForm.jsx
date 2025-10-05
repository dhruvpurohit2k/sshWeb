// Suggested update for LoginForm.jsx

import "./login.css";
function LoginForm(props) {
  function updateInput(event) {
    const { name, value } = event.target;
    props.updateCredentials((old) => ({ ...old, [name]: value }));
  }
  return (
    <div className="login-card">
      <h2>Remote SSH Access</h2>
      <div className="loginForm">
        <div className="form-group">
          <label htmlFor="host-input">HOST</label>
          <input
            id="host-input"
            name="host"
            value={props.credentials.host}
            onChange={updateInput}
            placeholder="eg. 127.0.0.1"
          />
        </div>
        <div className="form-group">
          <label htmlFor="user-input">USER</label>
          <input
            id="user-input"
            name="user"
            value={props.credentials.user}
            onChange={updateInput}
            placeholder="eg. ubuntu"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password-input">PASSWORD</label>
          <input
            id="password-input"
            type="password"
            name="password"
            placeholder="your password"
            onChange={updateInput}
            value={props.credentials.password}
          />
        </div>
        <button onClick={props.onSubmit}>Connect</button>
      </div>
    </div>
  );
}

export default LoginForm;
