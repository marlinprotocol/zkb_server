import bcrypt from "bcrypt";
require("dotenv").config();

export const validateApiSecret = (req: any, res: any, next: any) => {
  const server_mode = process.env.SERVER_MODE;
  if (server_mode == "PROD") {
    console.log("Authenticating in PROD mode");
    // Checking if the API secret key is provided in the header
    if (req.headers["api-key"] == "" || req.headers["api-key"] == undefined) {
      return res
        .status(400)
        .json({ message: "api-key is not provided in the headers" });
    }
    const header_api_secret_key = req.headers["api-key"];

    const api_secret_key = process.env.API_KEY;

    //Checking if the API secret key is valid
    bcrypt.compare(
      header_api_secret_key,
      api_secret_key!,
      function (err, result) {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .json({
              message: "Error authenticating with the provided api-key",
            });
        }
        if (!result) {
          return res
            .status(401)
            .json({
              message: "Authenticaton failed, invalid api-key provided",
            });
        } else {
          next();
        }
      }
    );
  } else if (server_mode == "DEV") {
    next();
  } else {
    return res
      .status(500)
      .json({ message: "There is an issue with server authentication" });
  }
};
