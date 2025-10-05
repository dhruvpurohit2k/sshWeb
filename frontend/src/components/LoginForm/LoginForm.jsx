import "./login.css";
function LoginForm(props) {
  function updateInput(event) {
    const { name, value } = event.target;
    props.updateCredentials((old) => ({ ...old, [name]: value }));
  }
  return (
    <div className="loginForm">
      <p className="formlabel">HOST : </p>
      <input
        className="formInput"
        name="host"
        value={props.credentials.host}
        onChange={updateInput}
        placeholder="eg. 127.0.0.1"
      />
      <p className="formlabel">USER : </p>
      <input
        className="formInput"
        name="user"
        value={props.credentials.user}
        onChange={updateInput}
        placeholder="ubuntu"
      />
      <p className="formlabel">PASSWORD : </p>
      <input
        className="formInput"
        name="password"
        placeholder="your password"
        onChange={updateInput}
        value={props.credentials.password}
      />
      <br />
      <button onClick={props.onSubmit}>SUBMIT</button>
    </div>
  );
}

export default LoginForm;
