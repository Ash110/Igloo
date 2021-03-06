module.exports = template = (name, ipAddress) => `<!DOCTYPE html
    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns="http://www.w3.org/1999/xhtml">

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>New Login on Igloo</title>
</head>

<body
    style="-webkit-text-size-adjust: none; box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; height: 100%; line-height: 1.4; margin: 0; width: 100% !important;"
    bgcolor="#F2F4F6">
    <style type="text/css">
        body {
            width: 100% !important;
            height: 100%;
            margin: 0;
            line-height: 1.4;
            background-color: #F2F4F6;
            color: #74787E;
            -webkit-text-size-adjust: none;
        }

        @media only screen and (max-width: 600px) {
            .email-body_inner {
                width: 100% !important;
            }

            .email-footer {
                width: 100% !important;
            }
        }

        @media only screen and (max-width: 500px) {
            .button {
                width: 100% !important;
            }
        }
    </style>
    <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0"
        style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;"
        bgcolor="#F2F4F6">
        <tr>
            <td align="center"
                style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                <table class="email-content" width="100%" cellpadding="0" cellspacing="0"
                    style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;">
                    <tr>
                        <td class="email-masthead"
                            style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 25px 0; word-break: break-word;"
                            align="center">
                            <a href="#" class="email-masthead_name"
                                style="box-sizing: border-box; color: #666666; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 24px; font-weight: bold; text-decoration: none; text-shadow: 0 1px 0 white;">
                                Igloo Social
                            </a>
                        </td>
                    </tr>

                    <tr>
                        <td class="email-body" width="100%" cellpadding="0" cellspacing="0"
                            style="-premailer-cellpadding: 0; -premailer-cellspacing: 0; border-bottom-color: #EDEFF2; border-bottom-style: solid; border-bottom-width: 1px; border-top-color: #EDEFF2; border-top-style: solid; border-top-width: 1px; box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%; word-break: break-word;"
                            bgcolor="#FFFFFF">
                            <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0"
                                style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0 auto; padding: 0; width: 570px;"
                                bgcolor="#FFFFFF">

                                <tr>
                                    <td class="content-cell"
                                        style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 35px; word-break: break-word;">
                                        <h1 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 19px; font-weight: bold; margin-top: 0;"
                                            align="left">Hey ${name},</h1>
                                        <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;"
                                            align="left">We've detected a new login on Igloo from this account. <br>
                                            These are the login
                                            If it was you, you can ignore this mail, everything's good.

                                        </p>
                                        <p>
                                            The Login was detected from the following IP Address - <br><br>
                                            <b>${ipAddress}</b>
                                        </p>
                                        <br>
                                        However, if this wasn't you, please do reset your account password immediately. To reset your password, head over to the app and reset password under <b> Privacy Settings </b>in the settings menu. If you're unable to access your account, contact us at support@igloosocial.com
                                        <br><br>
                                        <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;"
                                            align="left">Thanks,
                                            <br />Team Igloo
                                        </p>
                                        <br><br>
                                        <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;"
                                            align="left">
                                            PS : This is an automated mail, we cannot see any replies to this mail
                                            address. If you'd like to contact us, reach out at support@igloosocial.com
                                        </p>

                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td
                            style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                            <table class="email-footer" align="center" width="570" cellpadding="0" cellspacing="0"
                                style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0 auto; padding: 0; text-align: center; width: 570px;">
                                <tr>
                                    <td class="content-cell" align="center"
                                        style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 35px; word-break: break-word;">
                                        <p class="sub align-center"
                                            style="box-sizing: border-box; color: #AEAEAE; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 12px; line-height: 1.5em; margin-top: 0;"
                                            align="center">Igloo
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>`