// Suggested update for LoginForm.jsx

import "./login.css";
import { useState } from "react";
function LoginForm(props) {
  function updateInput(event) {
    const { name, value } = event.target;
    props.updateCredentials((old) => ({ ...old, [name]: value }));
  }
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    "new-user": "",
    "new-host": "",
    password: "",
    repassword: "",
    ssh: "",
  });
  function newUserChange(event) {
    setNewUser((oldUser) => ({
      ...oldUser,
      [event.target.name]: event.target.value,
    }));
  }
  function switchPane() {
    setCreatingUser(!creatingUser);
  }
  return (
    <>
      {creatingUser ? (
        <div className="login-card">
          <div className="loginForm">
            <h2>NEW USER</h2>
            <div className="form-group">
              <label htmlFor="new-user-input">USERNAME</label>
              <input
                id="new-user-input"
                name="new-user"
                value={newUser["new-user"]}
                onChange={newUserChange}
                placeholder="eg. John Doe"
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-host-input">HOST IP</label>
              <input
                id="new-host-input"
                name="new-host"
                value={newUser["new-host"]}
                onChange={newUserChange}
                placeholder="eg. 127.0.0.1"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ssh-input">SSH KEY</label>
              <input
                id="ssh-input"
                name="ssh"
                value={newUser.ssh}
                onChange={newUserChange}
                placeholder="Your SSH key"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password-input">PASSWORD</label>
              <input
                id="password-input"
                name="password"
                value={newUser.password}
                onChange={newUserChange}
                placeholder="Something Strong"
              />
            </div>
            <div className="form-group">
              <label htmlFor="repassword-input">RE ENTER PASSWORD</label>
              <input
                id="repassword-input"
                name="repassword"
                value={newUser.repassword}
                onChange={newUserChange}
                placeholder="Same As Above"
              />
            </div>
            <button
              onClick={() => {
                props.createNewUser(newUser);
              }}
            >
              CREATE
            </button>
            <button onClick={switchPane}>SIGN IN</button>
          </div>
        </div>
      ) : (
        <div className="login-card">
          <h2>Remote SSH Access</h2>
          <div className="loginForm">
            <div className="form-group">
              <label htmlFor="user-input">USER</label>
              <input
                id="user-input"
                name="username"
                value={props.credentials.username}
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
            <button onClick={switchPane}>SIGN UP</button>
          </div>
        </div>
      )}
    </>
  );
}

export default LoginForm;
