/**
 * Audio Buffer Utilities
 * 
 * A comprehensive set of utilities for manipulating AudioBuffer objects
 * for cut/copy/paste operations and other audio editing tasks.
 */

/**
 * Extract a segment of audio from an AudioBuffer
 * @param buffer - The source AudioBuffer
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @returns A new AudioBuffer containing the extracted segment
 */
export function extractAudioSegment(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Convert time to sample indices
  const startSample = Math.floor(startTime * buffer.sampleRate);
  const endSample = Math.floor(endTime * buffer.sampleRate);
  
  // Validate bounds
  const clampedStart = Math.max(0, Math.min(buffer.length, startSample));
  const clampedEnd = Math.max(clampedStart, Math.min(buffer.length, endSample));
  
  if (clampedStart >= clampedEnd) {
    throw new Error('Invalid time range: start time must be less than end time');
  }
  
  const segmentLength = clampedEnd - clampedStart;
  
  // Create new buffer for the segment
  const segmentBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    segmentLength,
    buffer.sampleRate
  );
  
  // Copy data for each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const segmentData = segmentBuffer.getChannelData(channel);
    
    for (let i = 0; i < segmentLength; i++) {
      segmentData[i] = sourceData[clampedStart + i];
    }
  }
  
  return segmentBuffer;
}

/**
 * Remove a segment of audio from an AudioBuffer and close the gap
 * @param buffer - The source AudioBuffer
 * @param startTime - Start time in seconds of segment to remove
 * @param endTime - End time in seconds of segment to remove
 * @returns A new AudioBuffer with the segment removed
 */
export function removeAudioSegment(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Convert time to sample indices
  const startSample = Math.floor(startTime * buffer.sampleRate);
  const endSample = Math.floor(endTime * buffer.sampleRate);
  
  // Validate bounds
  const clampedStart = Math.max(0, Math.min(buffer.length, startSample));
  const clampedEnd = Math.max(clampedStart, Math.min(buffer.length, endSample));
  
  // If nothing to remove, return a copy
  if (clampedStart >= clampedEnd) {
    return duplicateAudioBuffer(buffer);
  }
  
  const segmentLength = clampedEnd - clampedStart;
  const newLength = buffer.length - segmentLength;
  
  if (newLength <= 0) {
    throw new Error('Cannot remove entire audio buffer');
  }
  
  // Create new buffer without the removed segment
  const newBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    newLength,
    buffer.sampleRate
  );
  
  // Copy data for each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    
    // Copy data before the removed segment
    for (let i = 0; i < clampedStart; i++) {
      newData[i] = sourceData[i];
    }
    
    // Copy data after the removed segment
    for (let i = clampedEnd; i < buffer.length; i++) {
      newData[i - segmentLength] = sourceData[i];
    }
  }
  
  return newBuffer;
}

/**
 * Insert an audio segment into another AudioBuffer at a specific time
 * @param buffer - The destination AudioBuffer
 * @param segment - The AudioBuffer segment to insert
 * @param insertTime - Time in seconds where to insert the segment
 * @returns A new AudioBuffer with the segment inserted
 */
export function insertAudioSegment(
  buffer: AudioBuffer,
  segment: AudioBuffer,
  insertTime: number
): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Validate that buffers are compatible
  if (buffer.sampleRate !== segment.sampleRate) {
    throw new Error('Sample rates must match between buffers');
  }
  
  if (buffer.numberOfChannels !== segment.numberOfChannels) {
    throw new Error('Channel counts must match between buffers');
  }
  
  // Convert insert time to sample index
  const insertSample = Math.floor(insertTime * buffer.sampleRate);
  const clampedInsert = Math.max(0, Math.min(buffer.length, insertSample));
  
  const newLength = buffer.length + segment.length;
  
  // Create new buffer with combined length
  const newBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    newLength,
    buffer.sampleRate
  );
  
  // Copy data for each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const segmentData = segment.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    
    // Copy data before the insert point
    for (let i = 0; i < clampedInsert; i++) {
      newData[i] = sourceData[i];
    }
    
    // Copy the inserted segment
    for (let i = 0; i < segment.length; i++) {
      newData[clampedInsert + i] = segmentData[i];
    }
    
    // Copy data after the insert point
    for (let i = clampedInsert; i < buffer.length; i++) {
      newData[i + segment.length] = sourceData[i];
    }
  }
  
  return newBuffer;
}

/**
 * Create a deep copy of an AudioBuffer
 * @param buffer - The AudioBuffer to duplicate
 * @returns A new AudioBuffer with identical data
 */
export function duplicateAudioBuffer(buffer: AudioBuffer): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const newBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  
  // Copy data for each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    newData.set(sourceData);
  }
  
  return newBuffer;
}

/**
 * Concatenate multiple AudioBuffers into a single buffer
 * @param buffers - Array of AudioBuffers to concatenate
 * @returns A new AudioBuffer containing all input buffers joined together
 */
export function concatenateAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) {
    throw new Error('Cannot concatenate empty array of buffers');
  }
  
  if (buffers.length === 1) {
    return duplicateAudioBuffer(buffers[0]);
  }
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const firstBuffer = buffers[0];
  
  // Validate all buffers have the same sample rate and channel count
  for (let i = 1; i < buffers.length; i++) {
    if (buffers[i].sampleRate !== firstBuffer.sampleRate) {
      throw new Error('All buffers must have the same sample rate');
    }
    if (buffers[i].numberOfChannels !== firstBuffer.numberOfChannels) {
      throw new Error('All buffers must have the same number of channels');
    }
  }
  
  // Calculate total length
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  
  // Create new buffer
  const concatenatedBuffer = audioContext.createBuffer(
    firstBuffer.numberOfChannels,
    totalLength,
    firstBuffer.sampleRate
  );
  
  // Copy data for each channel
  for (let channel = 0; channel < firstBuffer.numberOfChannels; channel++) {
    const concatenatedData = concatenatedBuffer.getChannelData(channel);
    let offset = 0;
    
    for (const buffer of buffers) {
      const sourceData = buffer.getChannelData(channel);
      concatenatedData.set(sourceData, offset);
      offset += buffer.length;
    }
  }
  
  return concatenatedBuffer;
}

/**
 * Create a silent AudioBuffer with specified duration
 * @param duration - Duration in seconds
 * @param sampleRate - Sample rate (default: 44100)
 * @param numberOfChannels - Number of channels (default: 2)
 * @returns A new AudioBuffer filled with silence
 */
export function createSilentBuffer(
  duration: number,
  sampleRate: number = 44100,
  numberOfChannels: number = 2
): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const length = Math.floor(duration * sampleRate);
  
  // AudioBuffer is initialized with zeros by default, so we just need to create it
  return audioContext.createBuffer(numberOfChannels, length, sampleRate);
}

/**
 * Apply fade in and/or fade out effects to an AudioBuffer
 * @param buffer - The AudioBuffer to apply fades to
 * @param fadeInDuration - Fade in duration in seconds (0 for no fade in)
 * @param fadeOutDuration - Fade out duration in seconds (0 for no fade out)
 * @returns A new AudioBuffer with fades applied
 */
export function applyFade(
  buffer: AudioBuffer,
  fadeInDuration: number = 0,
  fadeOutDuration: number = 0
): AudioBuffer {
  const newBuffer = duplicateAudioBuffer(buffer);
  
  const fadeInSamples = Math.floor(fadeInDuration * buffer.sampleRate);
  const fadeOutSamples = Math.floor(fadeOutDuration * buffer.sampleRate);
  
  // Apply fades to each channel
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = newBuffer.getChannelData(channel);
    
    // Apply fade in
    for (let i = 0; i < Math.min(fadeInSamples, data.length); i++) {
      const fadeMultiplier = i / fadeInSamples;
      data[i] *= fadeMultiplier;
    }
    
    // Apply fade out
    const fadeOutStart = Math.max(0, data.length - fadeOutSamples);
    for (let i = fadeOutStart; i < data.length; i++) {
      const fadeMultiplier = (data.length - i) / fadeOutSamples;
      data[i] *= fadeMultiplier;
    }
  }
  
  return newBuffer;
}

/**
 * Get information about an AudioBuffer
 * @param buffer - The AudioBuffer to analyze
 * @returns Object containing buffer information
 */
export function getAudioBufferInfo(buffer: AudioBuffer): {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  sizeInBytes: number;
} {
  return {
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sizeInBytes: buffer.length * buffer.numberOfChannels * 4, // 4 bytes per float32 sample
  };
}

