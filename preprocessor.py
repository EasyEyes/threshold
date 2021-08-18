import os
import pandas as pd
import numpy as np
from csv import reader, writer

# Transpose
# https://stackoverflow.com/a/58267676/11069914
with open('experiment.csv', encoding='utf-8') as f, open('experiment_t.csv', 'w', encoding='utf-8') as fw:
    writer(fw, delimiter=',').writerows(zip(*reader(f, delimiter=',')))

# Make output directory

if not os.path.exists('./conditions'):
    os.makedirs('./conditions')

df = pd.read_csv('experiment_t.csv')

# Check parameter spelling
# TODO

# Translate researcher configuration to PsychoPy default
df_keys = df.keys()

df.rename(columns={
    'conditionName': 'label',
    'thresholdGuess': 'startVal',
    'thresholdBeta': 'beta',
    'thresholdDelta': 'delta',
    'thresholdProbability': 'pThreshold'
}, inplace=True)
if 'thresholdGuessLogSd' in df_keys:
    # Special case
    df['startValSd'] = np.log(df['thresholdGuessLogSd'])

# Export separate files

dataBlockRange = df['blockOrder'].unique()
dataBlockRange = dataBlockRange.tolist()

blockCounts = {'block': []}

for i, value in enumerate(dataBlockRange):
    blockCounts['block'].append(i)
    df[df['blockOrder'] == value].to_csv(
        './conditions/block_' + str(value) + '.csv', index=False)

df_blockCount = pd.DataFrame(data=blockCounts)
df_blockCount.to_csv('./conditions/blockCount.csv', index=False)
