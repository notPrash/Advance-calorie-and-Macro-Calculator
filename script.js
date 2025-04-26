// === Helper Functions ===
function kgToLbs(kg) {
    /**
     * Convert kilograms to pounds
     */
    return kg * 2.20462;
}

function lbsToKg(lbs) {
    /**
     * Convert pounds to kilograms
     */
    return lbs / 2.20462;
}

function cmToInches(cm) {
    /**
     * Convert centimeters to inches
     */
    return cm / 2.54;
}

function inchesToCm(inches) {
    /**
     * Convert inches to centimeters
     */
    return inches * 2.54;
}

// === BMR Calculation Functions ===
function calculateBmrMifflin(weightKg, heightCm, age, gender) {
    /**
     * Calculate BMR using the Mifflin-St Jeor Equation.
     * Formula is more accurate than the Harris-Benedict equation.
     */
    if (gender.toLowerCase() === 'male') {
        return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else if (gender.toLowerCase() === 'female') {
        return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    } else {
        // For non-binary individuals, use average of male and female formulas
        const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
        const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
        return (maleBmr + femaleBmr) / 2;
    }
}

function calculateBmrKatchMcardle(weightKg, bodyFatPercentage) {
    /**
     * Calculate BMR using the Katch-McArdle formula.
     * More accurate when body fat percentage is known.
     */
    const leanBodyMass = weightKg * (1 - (bodyFatPercentage / 100));
    return 370 + (21.6 * leanBodyMass);
}

function calculateTdee(bmr, activityLevel) {
    /**
     * Calculate Total Daily Energy Expenditure (TDEE) based on activity level.
     */
    const activityMultipliers = {
        'sedentary': 1.2,        // little or no exercise, desk job
        'light': 1.375,          // light exercise/sports 1–3 days/week
        'moderate': 1.55,        // moderate exercise/sports 3–5 days/week
        'very active': 1.725,    // hard exercise/sports 6–7 days/week
        'extra active': 1.9      // very hard exercise & physical job or 2x training
    };
    
    const multiplier = activityMultipliers[activityLevel.toLowerCase()];
    if (multiplier === undefined) {
        const validLevels = Object.keys(activityMultipliers).map(level => `'${level}'`).join(', ');
        throw new Error(`Invalid activity level. Choose from: ${validLevels}`);
    }
    
    return bmr * multiplier;
}

function getCalorieTargets(tdee) {
    /**
     * Determine calorie intake targets for different goals.
     */
    return {
        'maintenance': tdee,
        'mild_deficit': Math.max(tdee - 250, 1200),  // Mild deficit (0.25 kg/week)
        'moderate_deficit': Math.max(tdee - 500, 1200),  // Moderate deficit (0.5 kg/week)
        'aggressive_deficit': Math.max(tdee - 1000, 1200),  // Aggressive deficit (1 kg/week)
        'mild_surplus': tdee + 250,  // Mild surplus (0.25 kg/week gain)
        'moderate_surplus': tdee + 500  // Moderate surplus (0.5 kg/week gain)
    };
}

function calculateMacros(calorieTarget, weightKg, bodyFatPercentage = null, goal = 'weight_loss') {
    /**
     * Calculate recommended macronutrient intake based on goals.
     */
    // Calculate lean body mass if body fat percentage is provided
    const lbmKg = bodyFatPercentage !== null ? 
        weightKg * (1 - (bodyFatPercentage / 100)) : 
        weightKg * 0.8;
    
    // Set protein based on goal and lean body mass
    let proteinG, fatPercent;
    
    if (goal === 'weight_loss') {
        proteinG = lbmKg * 2.2;  // Higher protein for weight loss (2.2g per kg LBM)
        fatPercent = 0.30;       // 30% of calories from fat
    } else if (goal === 'muscle_gain') {
        proteinG = lbmKg * 1.8;  // 1.8g per kg LBM for muscle gain
        fatPercent = 0.25;       // 25% of calories from fat
    } else {  // maintenance
        proteinG = lbmKg * 1.6;  // 1.6g per kg LBM for maintenance
        fatPercent = 0.25;       // 25% of calories from fat
    }
    
    // Calculate fat and carbs
    const proteinCalories = proteinG * 4;
    const fatCalories = calorieTarget * fatPercent;
    const fatG = fatCalories / 9;
    
    // Remaining calories go to carbs
    const carbCalories = calorieTarget - proteinCalories - fatCalories;
    const carbG = carbCalories / 4;
    
    return {
        'protein': Math.round(proteinG),
        'carbs': Math.round(carbG),
        'fat': Math.round(fatG)
    };
}

// === Main Calculator Function ===
function calculateNutritionPlan(weight, height, age, gender, activityLevel, 
                               unitSystem = 'metric', bodyFatPercentage = null, goal = 'weight_loss') {
    /**
     * Calculate a complete nutrition plan including BMR, TDEE, calorie targets, and macros.
     */
    // Convert imperial to metric if needed
    let weightKg, heightCm;
    
    if (unitSystem.toLowerCase() === 'imperial') {
        weightKg = lbsToKg(weight);
        heightCm = inchesToCm(height);
    } else {
        weightKg = weight;
        heightCm = height;
    }
    
    // Calculate BMR using appropriate method
    let bmr, bmrMethod;
    
    if (bodyFatPercentage !== null) {
        bmr = calculateBmrKatchMcardle(weightKg, bodyFatPercentage);
        bmrMethod = "Katch-McArdle";
    } else {
        bmr = calculateBmrMifflin(weightKg, heightCm, age, gender);
        bmrMethod = "Mifflin-St Jeor";
    }
    
    // Calculate TDEE
    const tdee = calculateTdee(bmr, activityLevel);
    
    // Get calorie targets
    const calorieTargets = getCalorieTargets(tdee);
    
    // Calculate macros for each calorie target
    const macroPlans = {};
    
    for (const [targetName, calorieValue] of Object.entries(calorieTargets)) {
        let targetGoal;
        
        if (targetName.includes('deficit')) {
            targetGoal = 'weight_loss';
        } else if (targetName.includes('surplus')) {
            targetGoal = 'muscle_gain';
        } else {
            targetGoal = 'maintenance';
        }
        
        macroPlans[targetName] = calculateMacros(calorieValue, weightKg, bodyFatPercentage, targetGoal);
    }
    
    // Prepare all measurements in both units
    const measurements = {
        'metric': {
            'weight': weightKg,
            'height': heightCm,
            'weight_unit': 'kg',
            'height_unit': 'cm'
        },
        'imperial': {
            'weight': kgToLbs(weightKg),
            'height': cmToInches(heightCm),
            'weight_unit': 'lbs',
            'height_unit': 'inches'
        }
    };
    
    // Return complete nutrition plan
    return {
        'personal_info': {
            'age': age,
            'gender': gender,
            'activity_level': activityLevel,
            'body_fat_percentage': bodyFatPercentage,
            'measurements': measurements
        },
        'metabolic_info': {
            'bmr': Math.round(bmr),
            'bmr_method': bmrMethod,
            'tdee': Math.round(tdee)
        },
        'calorie_targets': Object.fromEntries(
            Object.entries(calorieTargets).map(([k, v]) => [k, Math.round(v)])
        ),
        'macro_plans': macroPlans,
        'original_unit_system': unitSystem
    };
}

// DOM interaction functions
document.addEventListener('DOMContentLoaded', function() {
    // Unit toggle selection
    const metricToggle = document.getElementById('metric-toggle');
    const imperialToggle = document.getElementById('imperial-toggle');
    const metricInputs = document.querySelectorAll('.metric-input');
    const imperialInputs = document.querySelectorAll('.imperial-input');
    
    metricToggle.addEventListener('click', function() {
        metricToggle.classList.add('active');
        imperialToggle.classList.remove('active');
        metricInputs.forEach(input => input.classList.remove('hidden'));
        imperialInputs.forEach(input => input.classList.add('hidden'));
    });
    
    imperialToggle.addEventListener('click', function() {
        imperialToggle.classList.add('active');
        metricToggle.classList.remove('active');
        imperialInputs.forEach(input => input.classList.remove('hidden'));
        metricInputs.forEach(input => input.classList.add('hidden'));
    });
    
    // Advanced options toggle
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedOptions = document.getElementById('advanced-options');
    
    advancedToggle.addEventListener('change', function() {
        if (this.checked) {
            advancedOptions.style.display = 'block';
            // Use animation to show the advanced options
            advancedOptions.style.opacity = 0;
            advancedOptions.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                advancedOptions.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                advancedOptions.style.opacity = 1;
                advancedOptions.style.transform = 'translateY(0)';
            }, 10);
        } else {
            // Hide with animation
            advancedOptions.style.opacity = 0;
            advancedOptions.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                advancedOptions.style.display = 'none';
            }, 300);
        }
    });
    
    // Body fat percentage enables Katch-McArdle formula
    const bodyFatInput = document.getElementById('body-fat');
    const formulaSelect = document.getElementById('formula');
    
    bodyFatInput.addEventListener('input', function() {
        if (this.value.trim() !== '') {
            formulaSelect.options[1].disabled = false;
            formulaSelect.value = 'katch';
        } else {
            formulaSelect.options[1].disabled = true;
            formulaSelect.value = 'mifflin';
        }
    });
    
    // Tab navigation
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and tab contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Add active class to clicked tab and show corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetId);
            targetContent.classList.add('active');
            
            // Add animation
            targetContent.style.display = 'block';
            targetContent.style.opacity = 0;
            setTimeout(() => {
                targetContent.style.transition = 'opacity 0.5s ease';
                targetContent.style.opacity = 1;
            }, 10);
        });
    });
    
    // Calculate button
    const calculateBtn = document.getElementById('calculate-btn');
    const loadingIndicator = document.getElementById('loading');
    const resultsContent = document.getElementById('results-content');
    
    calculateBtn.addEventListener('click', function() {
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        resultsContent.classList.add('hidden');
        
        // Add animation for the button
        this.classList.add('calculating');
        setTimeout(() => {
            this.classList.remove('calculating');
        }, 1000);
        
        // Simulate calculation delay for UI feedback
        setTimeout(() => {
            calculateResults();
            loadingIndicator.style.display = 'none';
            resultsContent.classList.remove('hidden');
            
            // Animate results appearance
            resultsContent.style.opacity = 0;
            setTimeout(() => {
                resultsContent.style.transition = 'opacity 0.6s ease';
                resultsContent.style.opacity = 1;
            }, 10);
            
            // Scroll to results
            document.getElementById('results-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }, 800);
    });
    
    // Populate input fields with conversions
    const weightMetric = document.getElementById('weight-metric');
    const weightImperial = document.getElementById('weight-imperial');
    const heightMetric = document.getElementById('height-metric');
    const heightImperial = document.getElementById('height-imperial');
    
    weightMetric.addEventListener('input', function() {
        weightImperial.value = (kgToLbs(parseFloat(this.value)) || 0).toFixed(1);
    });
    
    weightImperial.addEventListener('input', function() {
        weightMetric.value = (lbsToKg(parseFloat(this.value)) || 0).toFixed(1);
    });
    
    heightMetric.addEventListener('input', function() {
        heightImperial.value = (cmToInches(parseFloat(this.value)) || 0).toFixed(1);
    });
    
    heightImperial.addEventListener('input', function() {
        heightMetric.value = (inchesToCm(parseFloat(this.value)) || 0).toFixed(1);
    });
});

// Function to calculate and display results
function calculateResults() {
    // Get input values
    const gender = document.getElementById('gender').value;
    const age = parseInt(document.getElementById('age').value);
    const activityLevel = document.getElementById('activity-level').value;
    const goal = document.getElementById('goal').value;
    
    // Determine if metric or imperial is active
    const isMetric = document.getElementById('metric-toggle').classList.contains('active');
    const unitSystem = isMetric ? 'metric' : 'imperial';
    
    // Get weight and height based on unit system
    const weight = isMetric ? 
        parseFloat(document.getElementById('weight-metric').value) : 
        parseFloat(document.getElementById('weight-imperial').value);
    
    const height = isMetric ? 
        parseFloat(document.getElementById('height-metric').value) : 
        parseFloat(document.getElementById('height-imperial').value);
    
    // Get optional body fat percentage
    const bodyFatInput = document.getElementById('body-fat').value;
    const bodyFatPercentage = bodyFatInput !== '' ? parseFloat(bodyFatInput) : null;
    
    // Calculate nutrition plan
    const nutritionPlan = calculateNutritionPlan(
        weight, height, age, gender, activityLevel, unitSystem, bodyFatPercentage, goal
    );
    
    // Update UI with results
    updateResultsUI(nutritionPlan);
}

function updateResultsUI(plan) {
    // Update BMR and TDEE
    document.getElementById('bmr-value').textContent = plan.metabolic_info.bmr;
    document.getElementById('tdee-value').textContent = plan.metabolic_info.tdee;
    
    // Update calorie targets
    document.getElementById('weight-loss-value').textContent = plan.calorie_targets.moderate_deficit;
    document.getElementById('maintenance-value').textContent = plan.calorie_targets.maintenance;
    document.getElementById('weight-gain-value').textContent = plan.calorie_targets.moderate_surplus;
    
    // Update macros for weight loss
    updateMacroTab('weight-loss', plan.macro_plans.moderate_deficit);
    
    // Update macros for maintenance
    updateMacroTab('maintenance', plan.macro_plans.maintenance);
    
    // Update macros for weight gain
    updateMacroTab('weight-gain', plan.macro_plans.moderate_surplus);
    
    // Generate and update summary text
    const summary = generateSummary(plan);
    document.getElementById('result-summary').innerHTML = summary;
    
    // Add animations to the results cards
    animateResultsCards();
}

function updateMacroTab(tabId, macros) {
    const proteinG = macros.protein;
    const carbsG = macros.carbs;
    const fatG = macros.fat;
    
    const proteinCals = proteinG * 4;
    const carbsCals = carbsG * 4;
    const fatCals = fatG * 9;
    
    const totalCals = proteinCals + carbsCals + fatCals;
    
    const proteinPercent = Math.round((proteinCals / totalCals) * 100);
    const carbsPercent = Math.round((carbsCals / totalCals) * 100);
    const fatPercent = Math.round((fatCals / totalCals) * 100);
    
    // Update the text values
    document.getElementById(`${tabId}-protein`).textContent = `${proteinG}g`;
    document.getElementById(`${tabId}-protein-cals`).textContent = proteinCals;
    document.getElementById(`${tabId}-protein-percent`).textContent = `${proteinPercent}%`;
    
    document.getElementById(`${tabId}-carbs`).textContent = `${carbsG}g`;
    document.getElementById(`${tabId}-carbs-cals`).textContent = carbsCals;
    document.getElementById(`${tabId}-carbs-percent`).textContent = `${carbsPercent}%`;
    
    document.getElementById(`${tabId}-fat`).textContent = `${fatG}g`;
    document.getElementById(`${tabId}-fat-cals`).textContent = fatCals;
    document.getElementById(`${tabId}-fat-percent`).textContent = `${fatPercent}%`;
    
    // Update the chart
    document.getElementById(`${tabId}-protein-chart`).style.width = `${proteinPercent}%`;
    document.getElementById(`${tabId}-carbs-chart`).style.width = `${carbsPercent}%`;
    document.getElementById(`${tabId}-fat-chart`).style.width = `${fatPercent}%`;
}

function generateSummary(plan) {
    const gender = plan.personal_info.gender;
    const age = plan.personal_info.age;
    const weight = plan.personal_info.measurements.metric.weight;
    const height = plan.personal_info.measurements.metric.height;
    const activityLevel = plan.personal_info.activity_level;
    const bmr = plan.metabolic_info.bmr;
    const tdee = plan.metabolic_info.tdee;
    
    let summary = `<p>Based on your profile as a ${age}-year-old ${gender} weighing ${weight} kg with a height of ${height} cm and ${activityLevel} activity level, your body needs approximately <strong>${bmr} calories</strong> at rest (BMR) and <strong>${tdee} calories</strong> daily with your current activity (TDEE).</p>`;
    
    if (plan.personal_info.body_fat_percentage !== null) {
        summary += `<p>With your body fat percentage of ${plan.personal_info.body_fat_percentage}%, we've calculated your nutritional needs using the more precise Katch-McArdle formula.</p>`;
    }
    
    summary += `<p>For weight loss, we recommend a moderate deficit of ${plan.calorie_targets.moderate_deficit} calories per day, which would result in approximately 0.5 kg of weight loss per week. For muscle gain, consider a moderate surplus of ${plan.calorie_targets.moderate_surplus} calories daily.</p>`;
    
    summary += `<p>Your macronutrient distribution focuses on adequate protein to preserve lean muscle mass, moderate fat for hormonal health, and the remaining calories from carbohydrates to fuel your activity level.</p>`;
    
    return summary;
}

function animateResultsCards() {
    const cards = document.querySelectorAll('.results-card, .goal-card');
    
    cards.forEach((card, index) => {
        // Set initial state
        card.style.opacity = 0;
        card.style.transform = 'translateY(20px)';
        
        // Trigger animation with staggered delay
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = 1;
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
    
    // Animate macro charts
    const charts = document.querySelectorAll('.macro-chart');
    charts.forEach(chart => {
        const proteinBar = chart.querySelector('.macro-protein');
        const carbsBar = chart.querySelector('.macro-carbs');
        const fatBar = chart.querySelector('.macro-fat');
        
        // Save the final width values
        const proteinWidth = proteinBar.style.width;
        const carbsWidth = carbsBar.style.width;
        const fatWidth = fatBar.style.width;
        
        // Set initial state
        proteinBar.style.width = '0%';
        carbsBar.style.width = '0%';
        fatBar.style.width = '0%';
        
        // Trigger animations
        setTimeout(() => {
            proteinBar.style.transition = 'width 1s ease-out';
            proteinBar.style.width = proteinWidth;
            
            setTimeout(() => {
                carbsBar.style.transition = 'width 1s ease-out';
                carbsBar.style.width = carbsWidth;
                
                setTimeout(() => {
                    fatBar.style.transition = 'width 1s ease-out';
                    fatBar.style.width = fatWidth;
                }, 200);
            }, 200);
        }, 600);
    });
}

// Add additional CSS for enhanced animations
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .btn-calculate.calculating {
        animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .results-card, .goal-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .results-card:hover, .goal-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
    }
    
    .macro-protein, .macro-carbs, .macro-fat {
        transition: width 1s ease-out;
    }
    
    .form-group {
        position: relative;
        overflow: hidden;
    }
    
    input[type="number"], input[type="text"], select {
        transition: all 0.3s ease;
    }
    
    input[type="number"]:focus, input[type="text"]:focus, select:focus {
        transform: translateY(-2px);
    }
    
    .form-group::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 2px;
        background-color: var(--primary);
        transition: width 0.4s ease;
    }
    
    .form-group:focus-within::after {
        width: 100%;
    }
    
    .tab {
        position: relative;
        overflow: hidden;
    }
    
    .tab::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 0;
        height: 3px;
        background-color: var(--primary);
        transition: all 0.3s ease;
        transform: translateX(-50%);
    }
    
    .tab:hover::after {
        width: 80%;
    }
    
    .tab.active::after {
        width: 100%;
    }
    
    .results-section {
        animation: fadeIn 0.8s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .macro-legend .legend-item {
        transition: transform 0.3s ease;
    }
    
    .macro-legend .legend-item:hover {
        transform: translateX(5px);
    }
    
    .macro-table tr {
        transition: background-color 0.3s ease;
    }
    
    .macro-table tr:hover {
        background-color: rgba(74, 111, 165, 0.05);
    }
`;

document.head.appendChild(additionalStyles);