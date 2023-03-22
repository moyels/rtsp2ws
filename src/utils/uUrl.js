/**
 * 对 url 的参数进行重排，指定顺序，便于唯一标识一个url
 *
 * @param searchParams {URLSearchParams}
 * @return string 重排后的 params string
 */
const rearrangeParams = function (searchParams) {
  let paramKeys = [];

  for (let key of searchParams.keys()) {
    paramKeys.push(key);
  }

  // 对 param 进行排序
  paramKeys = paramKeys.sort();
  const paramStrings = [];
  for (const key of paramKeys) {
    const value = searchParams.get(key);

    if (value && value !== "" && value.trim() !== "") {
      paramStrings.push([key, value].join("="))
    }
  }

  return paramStrings.join("&");
}

/**
 * 重排url（对 query 参数进行排序）
 *
 * @param url {URL}
 * @return string 重排后的url
 */
const rearrangeUrl = function (url) {
  const params = rearrangeParams(url.searchParams);
  return [url.pathname, params].filter(v => {
    return v !== undefined && v !== "" && v.trim() !== "";
  }).join("?");
}

const uUrl = {rearrangeUrl, rearrangeParams};

module.exports = uUrl;