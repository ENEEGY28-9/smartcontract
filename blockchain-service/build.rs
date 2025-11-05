fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Temporarily disabled protobuf generation due to protoc not installed
    // TODO: Re-enable when protoc is installed
    // tonic_build::compile_protos("proto/blockchain.proto")?;
    Ok(())
}
