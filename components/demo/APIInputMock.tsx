// Mock UI Component for Demo Presentation
// This shows how users would input their API configurations

export const APIInputDemo = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Configure Real-World Data Sources</h2>
      
      {/* API Configuration 1 - Tariffs */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">🏛️</span> US Trade Department - Tariff Data
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">API Endpoint</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value="https://api.trade.gov/tariffs/v2/japan/automotive"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Authentication</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value="Bearer sk_trade_**********************"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Response Path</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value="data.current_rate"
              readOnly
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Condition</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                <option>Greater than ></option>
                <option>Less than <</option>
                <option>Equals =</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Threshold</label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value="15"
                readOnly
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value="%"
                readOnly
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded-md">
            <p className="text-sm text-green-800">
              ✅ Current Value: 15.5% - Condition Met!
            </p>
          </div>
        </div>
      </div>

      {/* API Configuration 2 - Inflation */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">🏦</span> Bank of Japan - Inflation Data
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">API Endpoint</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value="https://api.boj.or.jp/statistics/inflation/cpi"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Authentication</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value="API-Key: boj_**********************"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Response Path</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value="inflation.annual_rate"
              readOnly
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Condition</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                <option>Greater than ></option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Threshold</label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value="5"
                readOnly
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value="%"
                readOnly
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded-md">
            <p className="text-sm text-green-800">
              ✅ Current Value: 5.2% - Condition Met!
            </p>
          </div>
        </div>
      </div>

      {/* Logic Configuration */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Trigger Logic</h3>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-2 bg-white rounded-md shadow">
            Tariffs > 15%
          </div>
          <select className="px-4 py-2 bg-white rounded-md shadow">
            <option>AND</option>
            <option>OR</option>
          </select>
          <div className="px-4 py-2 bg-white rounded-md shadow">
            Inflation > 5%
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-md">
          <p className="text-sm text-blue-800">
            ✅ Both conditions met - Trigger will execute!
          </p>
        </div>
      </div>

      {/* Action Configuration */}
      <div className="mb-8 p-6 bg-purple-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Action When Triggered</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Convert</label>
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                className="w-32 rounded-md border-gray-300 shadow-sm"
                value="10"
                readOnly
              />
              <span>% of</span>
              <select className="rounded-md border-gray-300 shadow-sm">
                <option>JPYC</option>
              </select>
              <span>to</span>
              <select className="rounded-md border-gray-300 shadow-sm">
                <option>USDC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
        Create Smart Order with Real-World Triggers
      </button>
    </div>
  );
};