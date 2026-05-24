// api/gas-proxy.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbw7LowNX21HXUahM8gYhScX2ac_j1xfrakjr98_3kYhHbhbo0EnPS4j31MR04U2gbF-Qg/exec';
  
  try {
    let url = GAS_URL;
    if (req.method === 'GET' && req.query) {
      const params = new URLSearchParams();
      Object.keys(req.query).forEach(key => {
        if (key !== 't') params.append(key, req.query[key]);
      });
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const fetchOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
