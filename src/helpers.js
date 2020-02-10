/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const jwt = require('jsonwebtoken')
const debug = require('debug')('@adobe/aio-lib-core-ims-jwt')

/**
 * Convert a string value to Json. Returns the original string if it fails.
 *
 * @private
 * @param {string} value the value to attempt conversion to Json
 * @returns {object|string} the converted json, or the original string
 */
function parseJson (value) {
  try {
    return JSON.parse(value)
  } catch (e) {
    return value
  }
}

/**
 * Create a jwt token.
 *
 * @private
 * @param {object} ims the Ims object
 * @param {string} clientId The client ID assigned to the integration
 * @param {string} imsOrg The IMS Org ID of the customer
 * @param {string} techacct The Technical Account field of the integration
 * @param {string|Array} metaScopes The secret associated to the client ID
 * @param {string|Array} privateKey The private key associated with the integration
 * @param {string} [passphrase] The passphrase for the private key
 */
async function createJwt (ims, clientId, imsOrg, techacct, metaScopes, privateKey, passphrase) {
  // Prepare a short lived JWT token to exchange for an access token
  const payload = {
    exp: Math.round(Date.now() / 1000 + 300), // 5 minutes expiry time
    iss: imsOrg,
    sub: techacct,
    aud: ims.getApiUrl('/c/' + clientId)
  }

  // configure the metascope for the JWT (only one supported for now)
  metaScopes = parseJson(metaScopes)
  for (const metaScope of metaScopes) {
    payload[ims.getApiUrl('/s/' + metaScope)] = true
  }

  privateKey = parseJson(privateKey)
  let keyParam = (typeof (privateKey) === 'string') ? privateKey : privateKey.join('\n')
  if (passphrase) {
    keyParam = {
      key: privateKey,
      passphrase
    }
  }

  let jwtToken
  try {
    jwtToken = jwt.sign(payload, keyParam, { algorithm: 'RS256' }, null)
    debug('Signed JWT token: %s', jwtToken)
    return jwtToken
  } catch (err) {
    debug('JWT signing failed: %s', err.message)
    debug(err.stack)
    throw new Error('A passphrase is needed for your private-key. Use the --passphrase flag to specify one.')
  }
}

module.exports = {
  parseJson,
  createJwt
}
