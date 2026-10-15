// Adapted from Stardew-Profits bc8b72255e6960360415de9736756496971ccdcf.
// MIT license: ./LICENSE.txt. All mutable calculation state is call-local.
import { seasons, fertilizers } from './data.js';

export function calculateCore(options, random) {
var cropList;
var graphDescription;


function Clamp(value, min, max){
	if (max < min)
	{
		let num = min;
		min = max;
		max = num;
	}
	if (value < min)
	{
		value = min;
	}
	if (value > max)
	{
		value = max;
	}
	return value;
}

function PredictExtraHarvest(crop,num_planted,byHarvest){
	let r2 = random();
	let total = 0;
	let extraByHarvest = [];

	/*actual game code v1.6.3
	Random r2 = Utility.CreateRandom((double)xTile * 7.0, (double)yTile * 11.0, Game1.stats.DaysPlayed, Game1.uniqueIDForThisGame);
	while (r2.NextDouble() < Math.Min(0.9, data.ExtraHarvestChance)){
		numToHarvest++;
	}
	*/

	if(crop.produce.extraPerc != 0 ){		
		if(crop.produce.extraPerc != 1){
			//Per Harvest
			for (var h = 0; h < crop.harvests; h++){
				var hExtra = 0
				//Per Plant Picked
				for (var i = 0; i < num_planted; i++){
					r2 = random();
					if (r2 < Math.min(0.9,Number(crop.produce.extraPerc))){
						total++;
						hExtra++;
					}
				}
				extraByHarvest[h] = hExtra;
			}
		} else {
			total = num_planted * crop.harvests;
			extraByHarvest = Array(crop.harvests).fill(num_planted);
		}
	}
	return {total, extraByHarvest};
}

/*
 * Calculates the chance of crop quality based on foraging level and foraging skill botanist.
 * Math is from decompiled 1.6 game data
 *
 * @param foragingLevel The level of the Players foraging skill (0-15)
 * @param botanist If botanist skill option is checked (True|False)
 * @return Object returning predicted crop quality and probability of potential qualities.
 */
function PredictForaging(foragingLevel,botanist){
	let chance = {};

	// All wild crops are iridium if botanist is selected
	let forIridiumQuality = (botanist) ? 1 : 0;
	let forGoldQuality = foragingLevel / 30;
	let forSilverQuality = (1 - forGoldQuality) * (foragingLevel / 15);
	let forRegularQuality = (1 - forGoldQuality) * (1 - (foragingLevel / 15));

	const r = random(); //whats the max number usable here

	//Regular
	let cropQuality = 0;
	if (botanist){
		//iridium
		cropQuality = 4;
	} else if (r < (foragingLevel / 30)){
		//gold
		cropQuality = 2;
	} else if (r < (foragingLevel / 15)){
		//silver
		cropQuality = 1;
	}

	chance.iridium 		= forIridiumQuality;
	chance.gold 		= botanist ? 0 : forGoldQuality;
	chance.silver 		= botanist ? 0 : forSilverQuality;
	chance.regular 		= botanist ? 0 : forRegularQuality;
	chance.cropQuality 	= cropQuality;

	return chance;
}

/*
 * Calculates the chance of crop quality based on farmingLevel level and grade of fertilizer.
 * Math is from decompiled 1.6 game data
 *
 * @param farmingLevel The level of the Players farming skill (0-14)
 * @param fertilizerQualityLevel Quality of Fertilizer (0:Normal, 1:Silver, 2:Gold, 3:Iridium)
 * @return Object returning predicted crop quality and part of probability of potential qualities.
 */
function Predict(farmingLevel, fertilizerQualityLevel,isTea){
	let chance = {};
	if(isTea){
		chance.forRegularQuality 	= 1;
		chance.forSilverQuality 	= 0;
		chance.forGoldQuality 		= 0;
		chance.forIridiumQuality 	= 0;
		chance.cropQuality 			= 0;
	} else {
		var r2 = random();

		let forRegularQuality	= 0;
		let forGoldQuality      = Math.min(1, 0.2 * (farmingLevel / 10.0) + 0.2 * fertilizerQualityLevel * ((farmingLevel + 2.0) / 12.0) + 0.01);
		let forSilverQuality 	= Math.min(0.75, forGoldQuality * 2.0);
		let forIridiumQuality 	= 0;
		
		if(fertilizerQualityLevel < 3){
			forRegularQuality = 1 - (forSilverQuality + forGoldQuality);
		}
		if(fertilizerQualityLevel >= 3){
			forIridiumQuality = forGoldQuality / 2.0;
		}
	
		  //Regular
		let cropQuality = 0;
		if (fertilizerQualityLevel >= 3 && r2 < forGoldQuality / 2.0)
		{
			//iridium
			cropQuality = 4;
		}
		else if (r2 < forGoldQuality)
		{
			//Gold
			cropQuality = 2;
		}
		else if (r2 < forSilverQuality || fertilizerQualityLevel >= 3)
		{
			//Silver
			cropQuality = 1;
		}
		/* Code by ConcernedApe END */
		
		let minQuailty = 0;
		let maxQuailty = 3;
		if (fertilizerQualityLevel >= 3){
			minQuailty = 1;
			 maxQuailty = 4;
		}
		cropQuality = Clamp(cropQuality, minQuailty, maxQuailty);
	
	  chance.forRegularQuality 	= forRegularQuality;
	  chance.forSilverQuality 	= forSilverQuality;
	  chance.forGoldQuality 	= forGoldQuality;
	  chance.forIridiumQuality 	= forIridiumQuality;
	  chance.cropQuality 		= cropQuality;
	}

  return chance;
}

/*
 * Calculates the conditional probability of crop quality based event chance.
 * Math is from decompiled 1.6 game data
 *
 * @param farmingLevel The level of the Players farming skill (0-14)
 * @param fertilizerQualityLevel Quality of Fertilizer (0:Normal, 1:Silver, 2:Gold, 3:Iridium)
 * @return probability Object of crop qualities probability of occuring.
 */
function Probability( farmingLevel,  fertilizerQualityLevel,isTea){
    let probability = {};
	if(isTea){
		probability.iridium = 0;
		probability.gold = 0;
		probability.silver = 0;
		probability.regular = 1;

	} else {
		const chance = Predict(farmingLevel,fertilizerQualityLevel,false);
		
		let probabilityIridiumWillOccur = chance.forIridiumQuality;
		let probabilityIridiumWillNot	= 1 - probabilityIridiumWillOccur;
		
		let probabilityGoldWillOccur 	= (fertilizerQualityLevel >= 3) ? chance.forGoldQuality * probabilityIridiumWillNot : chance.forGoldQuality;
		let probabilityGoldWillNot 		= 1 - chance.forGoldQuality;
		
		let probabilitySilverWillOccur 	= probabilityGoldWillNot * chance.forSilverQuality;
		let probabilitySilverWillNot	= 1 - chance.forSilverQuality;
		if(fertilizerQualityLevel >= 3){
			probabilitySilverWillOccur = (probabilityGoldWillNot * probabilityIridiumWillNot < 0) ? 0.00 : probabilityGoldWillNot * probabilityIridiumWillNot;
		}
		
		let probabilityRegularWillOccur = (fertilizerQualityLevel < 3) ? probabilityGoldWillNot * probabilitySilverWillNot : 0.00;
	
		probability.iridium = probabilityIridiumWillOccur;
		probability.gold = probabilityGoldWillOccur;
		probability.silver = probabilitySilverWillOccur;
		probability.regular = probabilityRegularWillOccur;
	}
		
	return probability;
		
}

/*
 * Calculates number of crops that will be of a specific quality based on predictions.
 *
 * @param crop Crop Data
 * @param totalHarvest Total Produce picked on a harvest.
 * @param useLevel Players skill level
 * @param fertilizer Fertilizer quality used.
 * @param extra Extra Crops produced
 * @return [countRegular, countSilver, countGold, countIridium] Number of produce for each quality.
 */
function CountCropQuality(crop,totalHarvest,useLevel,fertilizer,extra){
	var countRegular = 0
	var countSilver = 0
	var countGold = 0
	var countIridium = 0

	var totalCrops = totalHarvest * crop.harvests;

	if (extra > 0 ){
		if (crop.isWildseed && options.skills.botanist)
			countIridium += extra * crop.produce.extra;
		else
			countRegular += extra * crop.produce.extra;
	}

	for (let i = 0; i < totalCrops; i++ ){
		const predicted = (crop.isWildseed) ? PredictForaging(options.foragingLevel,options.skills.botanist) : Predict(useLevel+options.foodLevel,fertilizer.ratio,crop.name == "Tea Leaves");
		
		switch(predicted.cropQuality){
			case 4:
				countIridium++
				break;
			case 2:
				countGold++
				break;
			case 1:
				countSilver++
				break;
			default:
				countRegular++
				break;
		}
	}

	return [countRegular, countSilver, countGold, countIridium];
}

/*
 * Calculates number of crops that will be of a specific quality based on predictions per harvest.
 *
 * @param crop Crop Data
 * @param totalHarvest Total Produce picked on a harvest.
 * @param useLevel Players skill level
 * @param fertilizer Fertilizer quality used.
 * @param extra Extra Crops produced
 * @return [countRegular, countSilver, countGold, countIridium] Number of produce for each quality.
 */
function CountCropQualityByHarvest(crop,totalHarvest,useLevel,fertilizer,extra){
	var countRegular = 0
	var countSilver = 0
	var countGold = 0
	var countIridium = 0
	var harvest = []

	if (extra > 0 ){
		countRegular += extra;
	}

	for (let h = 0; h < crop.harvests; h++){
		for (let i = 0; i < totalHarvest; i++ ){
			const predicted = (crop.isWildseed) ? PredictForaging(options.foragingLevel,options.skills.botanist) : Predict(useLevel+options.foodLevel,fertilizer.ratio);
			
			switch(predicted.cropQuality){
				case 4:
					countIridium++
					break;
				case 2:
					countGold++
					break;
				case 1:
					countSilver++
					break;
				default:
					countRegular++
					break;
			}
		}
		harvest[h] = [countRegular, countSilver, countGold, countIridium]
		countRegular = 0
		countSilver = 0
		countGold = 0
		countIridium = 0
	}

	return harvest;
	
}
function harvests(cropID) {
	var crop = seasons[options.season].crops[cropID];
	var fertilizer = fertilizers[options.fertilizer];
	// Tea blooms every day for the last 7 days of a season
	var isTea = crop.name == "Tea Leaves";

	// if the crop is NOT cross season, remove 28 extra days for each extra season
	var remainingDays = options.days - 28;
	if (options.crossSeason && options.season != 4) {
        var i = options.season + 1;
        if (i >= 4)
            i = 0;
		for (var j = 0; j < seasons[i].crops.length; j++) {
			var seasonCrop = seasons[i].crops[j];
			if (crop.name == seasonCrop.name) {
				remainingDays += 28;
				break;
			}
		}
	}
    else {
        remainingDays = options.days;
    }

	// console.log("=== " + crop.name + " ===");

	var harvests = 0;
	var day = 1;

	if (options.skills.agri)
		day += Math.ceil(crop.growth.initial * (fertilizer.growth - 0.1));
	else
		day += Math.ceil(crop.growth.initial * fertilizer.growth);

	if (day <= remainingDays && (!isTea || ((day-1) % 28 + 1) > 21))
		harvests++;

	while (day <= remainingDays) {
		if (crop.growth.regrow > 0) {
			// console.log("Harvest on day: " + day);
			day += crop.growth.regrow;
		}
		else {
			// console.log("Harvest on day: " + day);
			if (options.skills.agri)
				day += Math.ceil(crop.growth.initial * (fertilizer.growth - 0.1));
			else
				day += Math.ceil(crop.growth.initial * fertilizer.growth);
		}

		if (day <= remainingDays && (!isTea || ((day-1) % 28 + 1) > 21))
			harvests++;
	}

	// console.log("Harvests: " + harvests);
	return harvests;
}

/*
 * Calculates the minimum cost of a single packet of seeds.
 * @param crop The crop object, containing all the crop data.
 * @return The minimum cost of a packet of seeds, taking options into account.
 */
function minSeedCost(crop) {
	var minSeedCost = Infinity;

	if (crop.seeds.pierre != 0 && options.seeds.pierre && crop.seeds.pierre < minSeedCost)
		minSeedCost = crop.seeds.pierre;
	if (crop.seeds.joja != 0 && options.seeds.joja && crop.seeds.joja < minSeedCost)
		minSeedCost = crop.seeds.joja;
	if (crop.seeds.special != 0 && options.seeds.special && crop.seeds.special < minSeedCost)
		minSeedCost = crop.seeds.special;
    if (minSeedCost == Infinity)
        minSeedCost = 0;
	
	return minSeedCost;
}

/*
 * Calculates the number of crops planted.
 * @param crop The crop object, containing all the crop data.
 * @return The number of crops planted, taking the desired number planted and the max seed money into account.
 */
function planted(crop) {
	if (options.buySeed && options.maxSeedMoney !== 0) {
		return Math.min(options.planted, Math.floor(options.maxSeedMoney / minSeedCost(crop)));
	} else {
		return options.planted;
	}
}

/*
 * Removes Number of crops from a quality for specified scenarios. Use this function to take produce away used as seeds or consumed for artisan goods.
 * This assumes lowest quality will be consumed first..
 *
 * @param crop Crop Data
 * @param cropsLeft Crops left unused if not selling raw.
 * @param extra Extra Crops produced
 * @return [countRegular, countSilver, countGold, countIridium] Number of produce for each quality.
 */
function removeCropQuality(removeCrop,countRegular, countSilver, countGold, countIridium){
	if(removeCrop != 0){
		// used = (totalCrops + (extra * crop.produce.extra)) - cropsLeft //something wrong with selling excess here
		if (countRegular - removeCrop < 0){
			removeCrop -= countRegular;
			countRegular = 0;
			if (countSilver - removeCrop < 0 ){
				removeCrop -= countSilver;
				countSilver = 0;
				if (countGold - removeCrop < 0){
					removeCrop -= countGold;
					countGold = 0;
					if (countIridium - removeCrop < 0 ){
						removeCrop -= countIridium;
						countIridium = 0;
					} else {
						countIridium -= removeCrop;
						removeCrop = 0;
					}
				} else {
					countGold -= removeCrop;
					removeCrop = 0;
				}
			} else {
				countSilver -= removeCrop;
				removeCrop = 0;
			}
		} else {
			countRegular -= removeCrop;
			removeCrop = 0;
		}
	}

	return [countRegular, countSilver, countGold, countIridium];
}

/*
 * Calculates netIncome based on Quality of Raw produce and Till Skill.
 *
 * @param crop Crop Data
 * @param countRegular Number of crops at regular quality.
 * @param countSilver Number of crops at silver quality.
 * @param countGold Number of crops at gold quality.
 * @param countIridium Number of crops at iridium quality.
 * @return netIncome Total Net Income based only on raw produce by quality including till skill.
 */
function rawNetIncome(crop, countRegular, countSilver, countGold, countIridium){
	var netIncome = 0;
	
	netIncome += crop.produce.price * countRegular;
	netIncome += Math.trunc(crop.produce.price * 1.25) * countSilver;
	netIncome += Math.trunc(crop.produce.price * 1.5) * countGold;
	netIncome += crop.produce.price * 2 * countIridium;
	
	if (options.skills.till) {
		netIncome *= 1.1;
	}

	return netIncome;
}

/*
 * Calculates the number of crops to convert to seed for replant.
 * @param crop The crop object, containing all the crop data.
 * @param num_planted The number of crops planted.
 * @return The number of crops planted, taking the desired number planted and the max seed money into account.
 */
function convertToSeeds(crop,num_planted, isTea,isCoffee){
	var forSeeds = 0;
	if (options.replant && !isTea) {
		if (isCoffee && options.nextyear) {
			forSeeds = num_planted;
		} 
		else if (crop.growth.regrow > 0 && options.nextyear) {
			forSeeds = num_planted * 0.5;
		} 
		else if (crop.growth.regrow == 0) {
			forSeeds = num_planted * Math.max(0, crop.harvests - (options.nextyear ? 0 : 1)) * 0.5;
		}
	}
	return forSeeds;
}

/*
 * Calculates the keg base price for the crop.
 * @param crop The crop object, containing all the crop data.
 * @return The keg base price.
 */
function getKegBasePrice(crop) {

	return crop.produce.keg != null ? crop.produce.keg : crop.produce.kegType == "Wine" ? crop.produce.price * 3 : crop.produce.price * 2.25;
}

/*
 * Calculates the cask modifier for the crop based on aging.
 * @param crop The crop object, containing all the crop data.
 * @return The cask modifier.
 */
function getCaskModifier(crop) {
	if (crop.produce.ages){
		switch (options.aging) {
			case 0 : return 1;
			case 1: return 1.25;
			case 2: return 1.5;
			case 3: return 2;
			default: return 1;
		}
	} else {
		//Is not a Cask Item
		return 1;
	}
}

/*
 * Calculates the dehydrator modifier for 5 crops.
 * @param crop The crop object, containing all the crop data.
 * @return The dehydrator modifier.
 */
function getDehydratorModifier(crop) {
	var modifier = 7.5 * crop.produce.price + 25;
	switch(crop.produce.dehydratorType){
		case "Dried Fruit":
			modifier = options.skills.arti ?  10.5 * crop.produce.price + 35 : modifier;
			break;
		default: //We aren't calculating Mushrooms thus all else would be Grapes/Rasins
			modifier = options.skills.arti ? 840 : 600;
	}
    return modifier;
}

/*
 * Calculates the mill modifier for 3 crops.
 * @param crop The crop object, containing all the crop data.
 * @return The mill modifier.
 */
function getMillModifier(crop) {
	var modifier = 1;
	switch(crop.produce.millType){
		case "Rice":
			modifier = 100;
			break;
		case "Sugar":
			modifier = 50 * 3;
			break;
		default: // That leaves Wheat Flour
			modifier = 50
	}
    return modifier;
}


/*
 * Calculates the profit for a specified crop.
 * @param crop The crop object, containing all the crop data.
 * @return The total profit.
 */
function profit(crop) {
    const numPlanted = planted(crop);
    const fertilizer = fertilizers[options.fertilizer];
    const produce = options.produce;
    const isTea = crop.name === "Tea Leaves";
    const isCoffee = crop.name === "Coffee Bean";
    const useLevel = crop.isWildseed ? options.foragingLevel : options.level;
    const probability = crop.isWildseed
        ? PredictForaging(options.foragingLevel, options.skills.botanist)
        : Probability(useLevel + options.foodLevel, fertilizer.ratio, isTea);
    const typeField = { 1: "jarType", 2: "kegType", 4: "dehydratorType", 5: "millType" }[produce];
    const fallback = typeField != null && crop.produce[typeField] == null;

    // Produce and seed reservations are established before any machine consumes input.
    const extra = options.predictionModel ? PredictExtraHarvest(crop, numPlanted) : null;
    const producedPerHarvest = numPlanted * (1 + crop.produce.extraPerc * crop.produce.extra);
    const requestedSeeds = convertToSeeds(crop, numPlanted, isTea, isCoffee);
    const byHarvest = Array.from({ length: crop.harvests }, (_, index) => {
        const produced = options.predictionModel
            ? numPlanted + (extra.extraByHarvest[index] || 0) * crop.produce.extra
            : producedPerHarvest;
        let requested = 0;
        if (options.replant && !isTea) {
            if (crop.growth.regrow === 0 && (options.nextyear || index < crop.harvests - 1))
                requested = numPlanted * 0.5;
            else if (crop.growth.regrow > 0 && index === crop.harvests - 1)
                requested = requestedSeeds;
        }
        return { produced, seedReserved: Math.min(produced, requested), processedInput: 0 };
    });
    const totalProduced = options.predictionModel
        ? numPlanted * crop.harvests + extra.total * crop.produce.extra
        : producedPerHarvest * crop.harvests;
    const seedReserved = byHarvest.reduce((sum, item) => sum + item.seedReserved, 0);
    const available = totalProduced - seedReserved;
    crop.produce.extraProduced = options.predictionModel
        ? extra.total * crop.produce.extra
        : numPlanted * crop.produce.extraPerc * crop.produce.extra * crop.harvests;

    // Keep upstream RNG call ordering for unchanged raw-quality paths.
    const needsQuality = !fallback && produce !== 3 && produce !== 5 || fallback && options.sellRaw;
    let qualities = [0, 0, 0, 0];
    if (needsQuality) {
        qualities = options.predictionModel
            ? CountCropQuality(crop, numPlanted, useLevel, fertilizer, extra.total)
            : ["regular", "silver", "gold", "iridium"].map(quality => totalProduced * probability[quality]);
        qualities = removeCropQuality(seedReserved, ...qualities);
    }

    let quantitySold = 0;
    let quantityUnit = "raw";
    let processedInput = 0;
    let income = 0;
    const rawSale = produce === 0 || fallback && options.sellRaw;
    const processing = !fallback && produce !== 0;

    if (processing) {
        if (produce === 3 || produce === 5) {
            // Preserve fractional seed-maker/mill yield approximations, with explicit output units.
            for (const item of byHarvest)
                item.processedInput = item.produced - item.seedReserved;
            processedInput = available;
            if (produce === 3) {
                quantitySold = available * 2;
                quantityUnit = "seed";
                income = quantitySold * crop.seeds.sell;
            } else {
                const outputRatio = crop.produce.millType === "Sugar" ? 3 : 1;
                quantitySold = available * outputRatio;
                quantityUnit = crop.produce.millType;
                income = available * getMillModifier(crop);
            }
        } else {
            const batchSize = produce === 4 || produce === 2 && isCoffee ? 5 : 1;
            quantityUnit = produce === 2 && isCoffee ? "cup" : "batch";
            const capacity = options.equipment === 0 ? Infinity : options.equipment;
            if (produce === 4 && !options.byHarvest) {
                quantitySold = Math.min(capacity, Math.floor(available / batchSize));
                let remaining = quantitySold * batchSize;
                // Pooled dehydrator batches may draw from more than one harvest.
                for (const item of byHarvest) {
                    item.processedInput = Math.min(item.produced - item.seedReserved, remaining);
                    remaining -= item.processedInput;
                }
            } else {
                for (const item of byHarvest) {
                    const batches = Math.min(capacity, Math.floor((item.produced - item.seedReserved) / batchSize));
                    quantitySold += batches;
                    item.processedInput = batches * batchSize;
                }
            }
            processedInput = quantitySold * batchSize;
            let price;
            if (produce === 1) {
                price = (crop.produce.price * 2 + 50) * (options.skills.arti ? 1.4 : 1);
            } else if (produce === 2) {
                price = getKegBasePrice(crop) * getCaskModifier(crop);
                if (isCoffee) price *= 5;
                else if (options.skills.arti) price *= 1.4;
            } else {
                price = getDehydratorModifier(crop);
            }
            income = quantitySold * price;
        }
    }

    // Seed quality was removed once above; processing removes only its own input.
    if (needsQuality) qualities = removeCropQuality(processedInput, ...qualities);
    const remainingProduce = available - processedInput;
    const sellRemaining = rawSale || processing && options.sellExcess;
    const rawSold = sellRemaining ? remainingProduce : 0;
    if (sellRemaining) income += rawNetIncome(crop, ...qualities);
    if (rawSale) quantitySold = rawSold;
    const soldQualities = sellRemaining ? qualities : [0, 0, 0, 0];
    ["regular", "silver", "gold", "iridium"].forEach((quality, index) => {
        crop.produce[quality] = soldQualities[index];
    });

    let netExpenses = 0;
    if (options.buySeed) netExpenses += crop.seedLoss;
    if (options.buyFert) netExpenses += crop.fertLoss;
    const totalProfit = income + netExpenses;
    const totalReturnOnInvestment = netExpenses === 0 ? 0 : 100 * (totalProfit / -netExpenses);
    const averageReturnOnInvestment = totalReturnOnInvestment /
        (crop.growth.regrow === 0 ? crop.growth.initial : options.days);

    return {
        quantitySold,
        quantityUnit,
        excessProduce: processing ? remainingProduce : 0,
        revenue: income,
        material: {
            totalProduced, seedReserved, processedInput, rawSold,
            unsold: remainingProduce - rawSold, byHarvest,
        },
        totalReturnOnInvestment, averageReturnOnInvestment, netExpenses,
        profit: totalProfit,
        regular: probability.regular, silver: probability.silver,
        gold: probability.gold, iridium: probability.iridium,
    };
}
/*
 * Calculates the loss to profit when seeds are bought.
 * @param crop The crop object, containing all the crop data.
 * @return The total loss.
 */
function seedLoss(crop) {
	var harvests = crop.harvests;

    var loss = -minSeedCost(crop);

	if (crop.growth.regrow == 0 && harvests > 0 && !options.replant)
		loss = loss * harvests;

	return loss * planted(crop);
}

/*
 * Calculates the loss to profit when fertilizer is bought.
 *
 * Note that harvesting does not destroy fertilizer, so this is
 * independent of the number of harvests.
 *
 * @param crop The crop object, containing all the crop data.
 * @return The total loss.
 */
function fertLoss(crop) {
	var loss;
	if(options.fertilizer == 4 && options.fertilizerSource == 1)
		loss = -fertilizers[options.fertilizer].alternate_cost;
	else
		loss = -fertilizers[options.fertilizer].cost;
	return loss * planted(crop);
}

/*
 * Converts any value to the average per day value.
 * @param value The value to convert.
 * @return Value per day.
 */
function perDay(value) {
	return value / options.days;
}

/*
 * Performs filtering on a season's crop list, saving the new list to the cropList array.
 */
function fetchCrops() {
	cropList = [];

	var season = seasons[options.season];

	for (var i = 0; i < season.crops.length; i++) {
	    if ((options.seeds.pierre && season.crops[i].seeds.pierre != 0) ||
	    	(options.seeds.joja && season.crops[i].seeds.joja != 0) ||
    	    (options.seeds.special && season.crops[i].seeds.specialLoc != "")) {
	    	cropList.push(JSON.parse(JSON.stringify(season.crops[i])));
	    	cropList[cropList.length - 1].id = i;
		}
	}
}

/*
 * Calculates all profits and losses for all crops in the cropList array.
 */
function valueCrops() {
	for (var i = 0; i < cropList.length; i++) {
        if (cropList[i].isWildseed && options.skills.gatherer) {
            cropList[i].produce.extra += 1;
            cropList[i].produce.extraPerc += 0.2;
        }
		cropList[i].planted = planted(cropList[i]);
		cropList[i].harvests = harvests(cropList[i].id);
		cropList[i].seedLoss = seedLoss(cropList[i]);
		cropList[i].fertLoss = fertLoss(cropList[i]);
		cropList[i].profitData = profit(cropList[i]);
        cropList[i].profit = cropList[i].profitData.profit;
		cropList[i].totalReturnOnInvestment = cropList[i].profitData.totalReturnOnInvestment;
		cropList[i].averageReturnOnInvestment = cropList[i].profitData.averageReturnOnInvestment;
		cropList[i].netExpenses = cropList[i].profitData.netExpenses;
		cropList[i].averageProfit = perDay(cropList[i].profit);
		cropList[i].averageSeedLoss = perDay(cropList[i].seedLoss);
		cropList[i].averageFertLoss = perDay(cropList[i].fertLoss);

		if (options.average == 1) {
			cropList[i].drawProfit = cropList[i].averageProfit;
			cropList[i].drawSeedLoss = cropList[i].averageSeedLoss;
			cropList[i].drawFertLoss = cropList[i].averageFertLoss;
			graphDescription = "Daily Profit"
		}
		else if ((options.average == 2) ){
			if (options.buySeed || (options.buyFert && fertilizers[options.fertilizer].cost > 0)) {
				cropList[i].drawProfit = cropList[i].totalReturnOnInvestment;
				graphDescription = "Total Return On Investment";
			}
			else {
				cropList[i].drawProfit = 0;
				graphDescription = "Total Profit (Choose an expense for ROI)";
			}
			cropList[i].drawSeedLoss = cropList[i].seedLoss;
			cropList[i].drawFertLoss = cropList[i].fertLoss;
		}
		else if (options.average == 3) {
			cropList[i].drawSeedLoss = cropList[i].averageSeedLoss;
			cropList[i].drawFertLoss = cropList[i].averageFertLoss;
			if (options.buySeed || (options.buyFert && fertilizers[options.fertilizer].cost > 0)) {
				cropList[i].drawProfit = cropList[i].averageReturnOnInvestment;
				graphDescription = "Daily Return On Investment";
			}
			else {
				cropList[i].drawProfit = 0;
				graphDescription = "Daily Profit (Choose an expense for ROI)";
			}
		}
		else {
			cropList[i].drawProfit = cropList[i].profit;
			cropList[i].drawSeedLoss = cropList[i].seedLoss;
			cropList[i].drawFertLoss = cropList[i].fertLoss;
			graphDescription = "Total Profit";
		}
	}
}

/*
 * Sorts the cropList array, so that the most profitable crop is the first one.
 */
function sortCrops() {
	var swapped;
    do {
        swapped = false;
        for (var i = 0; i < cropList.length - 1; i++) {
            if (cropList[i].drawProfit < cropList[i + 1].drawProfit) {
                var temp = cropList[i];
                cropList[i] = cropList[i + 1];
                cropList[i + 1] = temp;
                swapped = true;
            }
        }
    } while (swapped);


	// console.log("==== SORTED ====");
	for (var i = 0; i < cropList.length; i++) {
		// console.log(cropList[i].drawProfit.toFixed(2) + "  " + cropList[i].name);
	}
}


fetchCrops();
valueCrops();
sortCrops();
return cropList;
}

