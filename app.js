// ត្រូវប្រាកដថា React និង Components ត្រូវបានទាញយករួចរាល់
const { useState, useEffect } = React;

// --- Main App Component ---
function App() {
  const [expenses, setExpenses] = useState([]);
  const [expenseTemplates, setExpenseTemplates] = useState([]); 
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [submitLoading, setSubmitLoading] = useState(false); 
  const [currentPage, setCurrentPage] = useState('dashboard'); 
  
  const [filterType, setFilterType] = useState('daily');
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0]); 
  const [isListFilterVisible, setIsListFilterVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // (កែប្រែ) ប្រើអថេរពី Global 'MySokhaApp'
  const { auth, rtdb, appId, firebase, initialAuthToken } = MySokhaApp;

  // 1. ដំណើរការ Authentication
  useEffect(() => {
    if (!auth) {
      console.log("Auth is not ready");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log("User is signed in with UID:", user.uid);
        setUserId(user.uid);
      } else {
        console.log("No user signed in, attempting sign in...");
        try {
          if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken);
            console.log("Signed in with custom token.");
          } else {
            await auth.signInAnonymously();
            console.log("Signed in anonymously.");
          }
        } catch (error) {
          console.error("Error signing in: ", error);
        }
      }
    });

    return () => unsubscribe();
  }, [auth, initialAuthToken]); // (កែប្រែ) បន្ថែម dependencies
  

  // 2. ភ្ជាប់ទៅ Firebase (Realtime DB)
  useEffect(() => {
    if (!rtdb || !appId) {
      console.log("RTDB not ready");
      return;
    }
    
    setLoading(true);
    
    // Listener សម្រាប់ ExpenseTemplates
    const templatesPath = `artifacts/${appId}/public/expenseTemplates`;
    console.log(`Setting up RTDB listener for: ${templatesPath}`);
    const templatesRef = rtdb.ref(templatesPath);
    
    const unsubscribeTemplates = templatesRef.on('value', 
      (snapshot) => {
        const templatesData = [];
        if (snapshot.exists()) {
          const data = snapshot.val();
          for (const key in data) {
            templatesData.push({ id: key, ...data[key] });
          }
        }
        templatesData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setExpenseTemplates(templatesData);
        console.log("Public templates loaded:", templatesData.length);
      },
      (error) => {
        console.error("Error fetching expense templates from RTDB: ", error);
      }
    );

    // Listener សម្រាប់ Expenses
    const expensesPath = `artifacts/${appId}/public/expenses`;
    console.log(`Setting up RTDB listener for: ${expensesPath}`);
    const expensesRef = rtdb.ref(expensesPath);
    
    const unsubscribeExpenses = expensesRef.on('value', 
      (snapshot) => {
        const expensesData = [];
        if (snapshot.exists()) {
          const data = snapshot.val();
          for (const key in data) {
            expensesData.push({ id: key, ...data[key] });
          }
        }
        setExpenses(expensesData);
        setLoading(false); 
      },
      (error) => {
        console.error("Error fetching expenses from RTDB: ", error);
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => {
      console.log("Cleaning up RTDB listeners.");
      templatesRef.off('value', unsubscribeTemplates);
      expensesRef.off('value', unsubscribeExpenses);
    };
  }, [rtdb, appId]); // (កែប្រែ) បន្ថែម dependencies

  // --- Functions សម្រាប់ CRUD (Create, Read, Update, Delete) ---

  const addExpense = async (expense) => {
    if (!rtdb || !firebase) return Promise.reject("RTDB not ready");
    
    const expenseData = {
      ...expense,
      createdAt: firebase.database.ServerValue.TIMESTAMP, // (កែប្រែ) ប្រើ Global
      addedBy: userId || 'anonymous' 
    };

    try {
      const collectionPath = `artifacts/${appId}/public/expenses`;
      const newExpenseRef = rtdb.ref(collectionPath).push();
      await newExpenseRef.set(expenseData);
    } catch (error) {
      console.error("Error adding document to RTDB: ", error);
      return Promise.reject(error); 
    }
  };

  const deleteExpense = async (id) => {
    if (!rtdb) return;
    try {
      const docPath = `artifacts/${appId}/public/expenses/${id}`;
      await rtdb.ref(docPath).remove();
    } catch (error) {
      console.error("Error deleting document from RTDB: ", error);
    }
  };
  
  const updateExpense = async (id, dataToUpdate) => {
    if (!rtdb) return;
    try {
      const docPath = `artifacts/${appId}/public/expenses/${id}`;
      await rtdb.ref(docPath).update(dataToUpdate);
      console.log("Updated expense:", id);
    } catch (error) {
      console.error("Error updating document in RTDB: ", error);
    }
  };
  
  const requestDeleteExpense = (id) => {
    setExpenseToDelete(id);
  };
  const confirmDeleteExpense = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete);
    }
    setExpenseToDelete(null);
  };
  const cancelDeleteExpense = () => {
    setExpenseToDelete(null);
  };
  
  const addExpenseTemplate = async (name) => {
    if (!rtdb || !name.trim() || !firebase) return;
    try {
      const collectionPath = `artifacts/${appId}/public/expenseTemplates`;
      const newTemplateRef = rtdb.ref(collectionPath).push(); 
      await newTemplateRef.set({ 
        name: name.trim(), 
        createdAt: firebase.database.ServerValue.TIMESTAMP // (កែប្រែ) ប្រើ Global
      });
      console.log("Added public template:", name);
    } catch (error)
    {
      console.error("Error adding expense template to RTDB: ", error);
    }
  };
  
  const deleteExpenseTemplate = async (id) => {
    if (!rtdb) return;
    try {
      const docPath = `artifacts/${appId}/public/expenseTemplates/${id}`;
      await rtdb.ref(docPath).remove();
      console.log("Deleted public template:", id);
    } catch (error) {
      console.error("Error deleting expense template from RTDB: ", error);
    }
  };

  // --- Render App ---
  // Components ទាំងអស់ (Navbar, ExpenseFilter, etc.) គឺមកពី 'components.js'
  return (
    <div className="min-h-screen bg-gray-100 p-5 sm:p-8 pb-24 sm:pb-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
            កម្មវិធីកត់ត្រាចំណាយ
          </h1>
          <p className="text-lg text-gray-600">ចំណាយប្រចាំខែ DUC</p>
        </header>
        
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

        <main>
          <div key={currentPage} className="page-fade-in">

            {currentPage === 'dashboard' && (
              <>
                <ExpenseFilter 
                  filterType={filterType}
                  setFilterType={setFilterType}
                  filterValue={filterValue}
                  setFilterValue={setFilterValue}
                />
                <ExpenseSummary 
                  expenses={expenses} 
                  loading={loading}
                  filterType={filterType}
                  filterValue={filterValue}
                />
              </>
            )}
            
            {currentPage === 'list' && (
              <>
                <div className="sm:hidden mb-4">
                  <button 
                    onClick={() => setIsListFilterVisible(!isListFilterVisible)}
                    className="w-full p-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 hover:bg-gray-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6-6.414a1 1 0 00-.293.707V19l-4 2v-5.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {isListFilterVisible ? 'លាក់ប្រអប់ស្វែងរក' : 'បង្ហាញប្រអប់ស្វែងរក'}
                  </button>
                </div>
                
                {isListFilterVisible && (
                  <div className="sm:hidden page-fade-in">
                    <ExpenseFilter 
                      filterType={filterType}
                      setFilterType={setFilterType}
                      filterValue={filterValue}
                      setFilterValue={setFilterValue}
                    />
                  </div>
                )}
                
                <div className="hidden sm:block">
                  <ExpenseFilter 
                    filterType={filterType}
                    setFilterType={setFilterType}
                    filterValue={filterValue}
                    setFilterValue={setFilterValue}
                  />
                </div>
              
                <ExpenseList 
                  expenses={expenses} 
                  requestDeleteExpense={requestDeleteExpense} 
                  updateExpense={updateExpense}
                  expenseTemplates={expenseTemplates}
                  loading={loading}
                  filterType={filterType}
                  filterValue={filterValue}
                />
              </>
            )}

            {currentPage === 'add' && (
              <>
                <BatchExpenseForm 
                  addExpense={addExpense}
                  expenseTemplates={expenseTemplates}
                  loading={submitLoading}
                  setLoading={setSubmitLoading}
                  expenses={expenses} 
                />
              </>
            )}

            {currentPage === 'templates' && ( 
              <>
                <ExpenseTemplateManager 
                  expenseTemplates={expenseTemplates}
                  addExpenseTemplate={addExpenseTemplate}
                  deleteExpenseTemplate={deleteExpenseTemplate}
                />
              </>
            )}
          
          </div>
        </main>

        <MobileNavbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        
        {expenseToDelete && (
          <ConfirmationModal 
            message="តើអ្នកពិតជាចង់លុបចំណាយនេះមែនទេ?"
            onConfirm={confirmDeleteExpense}
            onCancel={cancelDeleteExpense}
          />
        )}
      </div>
    </div>
  );
}

// --- 7. Render App ---
// ត្រូវប្រាកដថា ReactDOM ត្រូវបានទាញយករួចរាល់
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
