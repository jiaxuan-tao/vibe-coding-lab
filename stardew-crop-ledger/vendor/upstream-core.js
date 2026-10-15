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
					countSilver = 0;
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
	netIncome = 0;
	
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
			forSeeds = num_planted * crop.harvests * 0.5;
			if(!options.nextyear && forSeeds >= 1) 
				forSeeds -= num_planted * 0.5;
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
    profitData = {}
	var num_planted = planted(crop);
	var fertilizer = fertilizers[options.fertilizer];
	var produce = options.produce;
	var isTea = crop.name == "Tea Leaves";
	var isCoffee = crop.name == "Coffee Bean";

    var useLevel = options.level;
    if (crop.isWildseed)
        useLevel = options.foragingLevel;

	const probability = (crop.isWildseed) ? PredictForaging(options.foragingLevel,options.skills.botanist) : Probability(useLevel+options.foodLevel,fertilizer.ratio,isTea);

	var netIncome = 0;
	var netExpenses = 0;
	var totalProfit = 0;
	var totalReturnOnInvestment = 0;
	var averageReturnOnInvestment = 0;
	crop.produce.regular = 0
	crop.produce.silver = 0
	crop.produce.gold = 0
	crop.produce.iridium = 0
	
	//Skip keg/jar calculations for ineligible crops (where corp.produce.jar or crop.produce.keg = 0)
	
	var userawproduce = false;

	switch(produce) {
		case 1: 
			if(crop.produce.jarType == null) userawproduce = true;
			break;
		case 2:
			if(crop.produce.kegType == null) userawproduce = true;
			break;	
		case 4:
			if(crop.produce.dehydratorType == null) userawproduce = true;
			break;
		case 5:
			if(crop.produce.millType == null) userawproduce = true;
			break;
	}
	
	//Determine how many produce will be used for seeds.
	var forSeeds = convertToSeeds(crop,num_planted,isTea,isCoffee)
	var total_harvest = 0;
	var total_crops = 0;
	var extra = {};

	if (options.predictionModel){
		extra = PredictExtraHarvest(crop,num_planted);
		crop.produce.extraProduced = extra.total * crop.produce.extra;

		total_harvest = num_planted * 1.0
		total_crops = (total_harvest * crop.harvests) + (extra.total * crop.produce.extra)
	} else {
		extra.total = (crop.produce.extraPerc * crop.produce.extra) * crop.harvests;
		crop.produce.extraProduced = Math.floor(extra.total);

		total_harvest = num_planted * 1.0 + num_planted * crop.produce.extraPerc * crop.produce.extra;
		total_crops = total_harvest * crop.harvests;
	}

	// Determine income
	/*
	* 	Produce Types:
	*	0 = Raw
	*	1 = Jar
	*	2 = Keg
	*	3 = Seeds
	*	4 = Dehydrator
	*	5 = Mill
	*/
	if (produce != 3 && produce != 5 || userawproduce) {
        if (userawproduce && !options.sellRaw) {
            netIncome = 0;
        }
        else {
			//First we need to find crop quality for all crops
			//Then remove crops repurposed for seeds (take away from regular quality first)
			//If we're working with an artisan then we will look at excess (by time) to take away qualities
            var countRegular = 0
            var countSilver = 0
            var countGold = 0
            var countIridium = 0

			if(options.predictionModel){
				var [countRegular, countSilver, countGold, countIridium] = CountCropQuality(crop,total_harvest,useLevel,fertilizer,extra.total);
	
			} else {
				countRegular 	= total_crops * probability.regular;
				countSilver 	= total_crops * probability.silver;
				countGold 		= total_crops * probability.gold;
				countIridium 	= total_crops * probability.iridium;
			}
			//Remove produce converted to Seed
			var [countRegular, countSilver, countGold, countIridium] = removeCropQuality(forSeeds,countRegular, countSilver, countGold, countIridium)	
			

            if (produce == 0 || userawproduce) {
				
				netIncome += rawNetIncome(crop, countRegular, countSilver, countGold, countIridium);

				crop.produce.regular = countRegular
				crop.produce.silver = countSilver
				crop.produce.gold = countGold
				crop.produce.iridium = countIridium
                profitData.quantitySold  = Math.floor(total_crops - forSeeds);
            }
            else if (produce == 1 || produce == 2 || produce == 4) {

                var usableCrops = 0;
				var usableCropsByHarvest = [];
				//extra isn't being accounted for by harvest
                if (produce != 4 || options.byHarvest) {
					if(options.predictionModel && crop.produce.extra > 0){
						if (extra.extraByHarvest.length >0 ){
							for (i in extra.extraByHarvest){ 
								usableCropsByHarvest[i] = Math.floor(total_harvest) + extra.extraByHarvest[i];
								if (options.replant && !isTea && crop.growth.regrow == 0)
									usableCropsByHarvest[i] -= num_planted * 0.5;
								usableCropsByHarvest[i] = Math.max(0, usableCropsByHarvest[i]);
							}
						}
					} else {
						usableCrops = Math.floor(total_harvest);
						if (options.replant && !isTea && crop.growth.regrow == 0)
							usableCrops -= num_planted * 0.5;
						usableCrops = Math.max(0, usableCrops);
					}
                }
                else {
                    usableCrops = Math.floor(total_crops - forSeeds);
                    usableCrops = Math.max(0, usableCrops);
                }

                var itemsMade = 0;
                var cropsLeft = 0;
                if (produce == 1 || produce == 2) {
					if(options.predictionModel && usableCropsByHarvest.length > 0){
						for (i in usableCropsByHarvest){
							itemsMade += Math.floor(usableCropsByHarvest[i]);
						}
					} else {
						itemsMade = usableCrops;
					}
                }
                else if (produce == 4) {
					if(options.predictionModel && usableCropsByHarvest.length > 0){
						for (i in usableCropsByHarvest){
							cropsLeft += Math.floor(usableCropsByHarvest[i] % 5);
							itemsMade += Math.floor(usableCropsByHarvest[i] / 5);
						}
					} else {
						cropsLeft = Math.floor(usableCrops % 5);
						itemsMade = Math.floor(usableCrops / 5);
					}
                }

                if (produce == 4 && options.equipment > 0 && options.byHarvest) {
					if(options.predictionModel && usableCropsByHarvest.length > 0){
						itemsMade = Math.min(options.equipment * crop.harvests, Math.floor(total_crops / 5))
						cropsLeft = total_crops - (itemsMade * 5)

					} else {
						cropsLeft += Math.max(0, itemsMade - options.equipment) * 5;
						itemsMade = Math.min(options.equipment, itemsMade);
					}
                }

                if (produce == 4 && options.byHarvest) {
					if(usableCropsByHarvest.length == 0){
						cropsLeft *= crop.harvests;
						itemsMade *= crop.harvests;
					}
                }
                if (options.nextyear && options.byHarvest) {
                    if (produce == 4) {
                        var itemsMadeNew = Math.max(0, Math.round((itemsMade * 5 - num_planted * 0.5) / 5));
                        cropsLeft += (itemsMade - itemsMadeNew) * 5;
                        itemsMade = itemsMadeNew;
                    }
                }

                if (options.equipment > 0) {
                    if (produce == 1 || produce == 2) {
						if(options.predictionModel && usableCropsByHarvest.length > 0){
							itemsMade = Math.min(options.equipment * crop.harvests, Math.floor(total_crops));
							cropsLeft = total_crops - itemsMade; 

						} else {
							cropsLeft += Math.max(0, itemsMade - options.equipment) * crop.harvests;
							itemsMade = Math.min(options.equipment, itemsMade) * crop.harvests;
						}
                    }
                    if (produce == 4 && !options.byHarvest) {
                        cropsLeft += Math.max(0, itemsMade - options.equipment) * 5;
                        itemsMade = Math.min(options.equipment, itemsMade);
                    }
                }
                else {
                    if (produce == 1 || produce == 2) {
						if(!options.predictionModel){
                        	itemsMade *= crop.harvests;
						}
                    }
                }

                if (options.nextyear) {
                    if (produce == 1 || produce == 2) {
                        cropsLeft += num_planted * 0.5;
                        itemsMade = Math.max(0, itemsMade - num_planted * 0.5);
                    }
                }

                if (options.sellExcess && cropsLeft > 0){
					//Remove produce used in artisan goods
					[countRegular, countSilver, countGold, countIridium] = removeCropQuality((total_crops - cropsLeft),countRegular, countSilver, countGold, countIridium);

					netIncome += rawNetIncome(crop, countRegular, countSilver, countGold, countIridium);
					crop.produce.regular 	= Math.round((countRegular + Number.EPSILON) * 100) / 100;
					crop.produce.silver 	= Math.round((countSilver + Number.EPSILON) * 100) / 100;
					crop.produce.gold 		= Math.round((countGold + Number.EPSILON) * 100) / 100;
					crop.produce.iridium 	= Math.round((countIridium + Number.EPSILON) * 100) / 100;
				}

                var kegBasePrice = getKegBasePrice(crop);
                var caskModifier = getCaskModifier(crop);
                var dehydratorModifier = getDehydratorModifier(crop);
				var kegPrice = 0;
                if (options.produce == 1) {
                    netIncome += itemsMade * (options.skills.arti ? (crop.produce.price * 2 + 50) * 1.4 : crop.produce.price * 2 + 50);
                }
                else if (options.produce == 2) {
					kegPrice = kegBasePrice * caskModifier;
                    netIncome += options.skills.arti && crop.produce.kegType != "Coffee" ? itemsMade * (kegPrice * 1.4) : itemsMade * kegPrice;
                }
                else if (options.produce == 4) {
                    netIncome += crop.produce.dehydratorType != null ? itemsMade * dehydratorModifier : 0;
                }
        
                profitData.quantitySold = itemsMade;
                profitData.excessProduce = cropsLeft;
            }
        }
		
	}
    else if (produce == 3) {
        var items = total_crops - forSeeds;
        netIncome += 2 * items * crop.seeds.sell;
		profitData.quantitySold = Math.floor(2 * items);
    }
	else if (produce == 5) {
		var items = total_crops - forSeeds;
		var millModifier = getMillModifier(crop);
		netIncome += millModifier * items;
		profitData.quantitySold = items;
    }

	// Determine expenses
	if (options.buySeed) {
		netExpenses += crop.seedLoss;
		// console.log("Profit (After seeds): " + profit);
	}

	if (options.buyFert) {
		netExpenses += crop.fertLoss;
		// console.log("Profit (After fertilizer): " + profit);
	}

	// Determine total profit
	totalProfit = netIncome + netExpenses;
	// maxTotalProfit = maxNetIncome + netExpenses;
	// predTotalProfit = predNetIncome + netExpenses;
	if (netExpenses != 0) {
		totalReturnOnInvestment = 100 * ((totalProfit) / -netExpenses); // Calculate the return on investment and scale it to a % increase
		if (crop.growth.regrow == 0) {
			averageReturnOnInvestment = (totalReturnOnInvestment / crop.growth.initial);
		}
		else {
			averageReturnOnInvestment = (totalReturnOnInvestment / options.days);
		}
	}
	else {
		totalReturnOnInvestment = 0;
		averageReturnOnInvestment = 0;
	}

	profitData.totalReturnOnInvestment = totalReturnOnInvestment;
	profitData.averageReturnOnInvestment = averageReturnOnInvestment;
	profitData.netExpenses = netExpenses;
    profitData.profit = totalProfit;

    // profitData.maxProfit = maxTotalProfit;
	// profitData.predTotalProfit = predTotalProfit

    profitData.regular = probability.regular;
    profitData.silver = probability.silver;
    profitData.gold = probability.gold;
    profitData.iridium = probability.iridium;

	// console.log("Profit: " + profit);
	return profitData;
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


